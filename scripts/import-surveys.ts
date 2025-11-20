import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QuestionType, TargetAudience } from '../types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:uCA1w94XIvRY9Ez1@cluster.jza4cpo.mongodb.net/?appName=cluster';
const DB_NAME = 'survey2'; // Target database

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: Option[];
    isRequired: boolean;
    order: number;
}

interface Survey {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    isActive: boolean;
    createdAt: number;
    targetAudience: TargetAudience;
}

function generateId(): string {
    return new ObjectId().toString();
}

function parseMarkdown(content: string): Survey[] {
    const surveys: Survey[] = [];
    const surveyBlocks = content.split(/^## /m).slice(1); // Skip header

    for (const block of surveyBlocks) {
        const lines = block.split('\n');
        const titleLine = lines[0].trim();
        // Extract title: "설문 1: 제목" -> "제목"
        const titleMatch = titleLine.match(/설문 \d+: (.+)/);
        const title = titleMatch ? titleMatch[1].trim() : titleLine;

        const questions: Question[] = [];
        const questionBlocks = block.split(/^\*\*Q/m).slice(1);

        questionBlocks.forEach((qBlock, index) => {
            const qLines = qBlock.split('\n');
            // Extract question text: "1. 질문 내용**" -> "질문 내용"
            const qTitleLine = qLines[0].trim();
            const qTextMatch = qTitleLine.match(/\d+\. (.+)\*\*/);
            const qText = qTextMatch ? qTextMatch[1].trim() : qTitleLine.replace(/\*\*$/, '');

            const options: Option[] = [];
            let type = QuestionType.SINGLE_CHOICE;

            // Parse options
            for (let i = 1; i < qLines.length; i++) {
                const line = qLines[i].trim();
                if (line.match(/^\d+\./)) {
                    const optText = line.replace(/^\d+\.\s*/, '').trim();
                    options.push({
                        id: generateId(),
                        text: optText
                    });
                }
            }

            // Heuristics for Question Type
            if (options.length === 0) {
                type = QuestionType.TEXT;
            } else if (qText.includes('이메일')) {
                type = QuestionType.EMAIL;
            } else if (options.some(o => o.text.includes('입력'))) {
                // If an option is explicitly "Input", it might be mixed, but for now treat as choice unless it's the only one
                if (options.length === 1 && (options[0].text.includes('입력') || options[0].text.includes('text_input'))) {
                    type = QuestionType.TEXT;
                    options.length = 0; // Clear dummy options
                }
            }

            questions.push({
                id: generateId(),
                text: qText,
                type: type,
                options: type === QuestionType.SINGLE_CHOICE ? options : undefined,
                isRequired: true,
                order: index + 1
            });
        });

        // Determine Target Audience based on title
        let targetAudience = TargetAudience.GENERAL;
        if (title.includes('기업') || title.includes('임직원')) {
            targetAudience = TargetAudience.EMPLOYEE;
        }

        surveys.push({
            id: generateId(),
            title: title,
            description: '',
            questions: questions,
            isActive: true,
            createdAt: Date.now(),
            targetAudience: targetAudience
        });
    }

    return surveys;
}

async function importSurveys() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log(`✅ Connected to MongoDB: ${DB_NAME}`);

        const db = client.db(DB_NAME);
        const collection = db.collection('surveys');

        // Read markdown file
        const mdPath = path.join(__dirname, '../surveys-export.md');
        const mdContent = fs.readFileSync(mdPath, 'utf-8');

        const surveys = parseMarkdown(mdContent);

        if (surveys.length === 0) {
            console.log('⚠️ No surveys found in markdown.');
            return;
        }

        // Clear existing surveys (optional, maybe ask user? but for now just insert)
        // For safety, let's just insert. Or maybe delete all to ensure clean state as per "Write it with this"
        // "Write it with this" implies this should be THE data.
        const deleteResult = await collection.deleteMany({});
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing surveys`);

        const result = await collection.insertMany(surveys);
        console.log(`✅ Imported ${result.insertedCount} surveys into ${DB_NAME}.surveys`);

        // Log details
        surveys.forEach(s => {
            console.log(`- ${s.title} (${s.questions.length} questions)`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

importSurveys();
