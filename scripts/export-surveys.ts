import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';

// 여러 데이터베이스와 컬렉션 확인
const DB_NAMES = ['survey_apps', 'survey_app', 'survey2'];
const COLLECTION_NAMES = ['survey', 'surveys'];

async function exportSurveys() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  let client: MongoClient;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    let surveys: any[] = [];
    let foundDb = '';
    let foundCollection = '';

    // 여러 데이터베이스와 컬렉션에서 찾기
    for (const dbName of DB_NAMES) {
      for (const collName of COLLECTION_NAMES) {
        try {
          const db = client.db(dbName);
          const collection = db.collection(collName);
          const found = await collection.find({}).toArray();
          if (found.length > 0) {
            surveys = found;
            foundDb = dbName;
            foundCollection = collName;
            console.log(`📊 ${dbName}.${collName}에서 ${surveys.length}개의 설문을 찾았습니다.`);
            break;
          }
        } catch (e) {
          // 컬렉션이 없을 수 있음
        }
      }
      if (surveys.length > 0) break;
    }

    if (surveys.length === 0) {
      console.log('⚠️  설문 데이터를 찾을 수 없습니다.');
      console.log(`검색한 위치: ${DB_NAMES.join(', ')} 데이터베이스의 ${COLLECTION_NAMES.join(', ')} 컬렉션`);
      await client.close();
      return;
    }

    if (surveys.length === 0) {
      console.log('⚠️  설문 데이터가 없습니다.');
      await client.close();
      return;
    }


    // 마크다운 생성 (간단한 형태)
    let markdown = `# 설문조사 목록\n\n`;

    surveys.forEach((survey: any, index: number) => {
      const title = survey.title || '제목 없음';
      const questions = survey.questions || [];

      markdown += `## 설문 ${index + 1}: ${title}\n\n`;

      if (questions && questions.length > 0) {
        // order 필드로 정렬 (있는 경우)
        const sortedQuestions = [...questions].sort((a: any, b: any) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          return 0;
        });

        sortedQuestions.forEach((q: any, qIndex: number) => {
          const qText = q.title || q.text || q.question || '질문 없음';
          const qOptions = q.options || [];

          markdown += `**Q${qIndex + 1}. ${qText}**\n`;

          if (qOptions && qOptions.length > 0) {
            qOptions.forEach((opt: any, optIndex: number) => {
              const optText = opt.label || opt.text || opt.title || opt.value || '옵션 없음';
              markdown += `  ${optIndex + 1}. ${optText}\n`;
            });
          }
          markdown += `\n`;
        });
      } else {
        markdown += `질문 없음\n\n`;
      }

      markdown += `---\n\n`;
    });

    // 파일로 저장
    const outputPath = path.join(__dirname, '../surveys-export.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✅ 마크다운 파일이 생성되었습니다: ${outputPath}`);

    await client.close();
    console.log('✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    if (client) {
      await client.close();
    }
    process.exit(1);
  }
}

exportSurveys();

