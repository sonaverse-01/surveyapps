
export enum QuestionType {
    SINGLE_CHOICE = 'SINGLE_CHOICE',
    TEXT = 'TEXT',
    RATING = 'RATING',
    EMAIL = 'EMAIL',
    PHONE = 'PHONE'
}

export interface Option {
    id: string;
    text: string;
    nextQuestionId?: string | null; // Logic jump: if selected, go to this question
}

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options?: Option[]; // For Choice types
    isRequired: boolean;
}

export enum TargetAudience {
    ALL = 'ALL',
    EMPLOYEE = 'EMPLOYEE',
    GENERAL = 'GENERAL'
}

export interface Survey {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    isActive: boolean;
    createdAt: number;
    targetAudience: TargetAudience; // New field for segmentation
}

export enum UserType {
    EMPLOYEE = 'EMPLOYEE',
    GENERAL = 'GENERAL'
}

export interface ResponseValue {
    questionId: string;
    answer: string | number; // Option ID or text content
    questionText: string; // Snapshot for history
}

export interface SurveyResponse {
    id: string;
    surveyId: string;
    userType: UserType;
    answers: ResponseValue[];
    submittedAt: number;
}

export interface AnalyticsData {
    totalResponses: number;
    byUserType: { [key in UserType]: number };
    questionBreakdown: {
        [questionId: string]: {
            counts: { [optionIdOrValue: string]: number };
            textAnswers: string[];
        }
    };
}
