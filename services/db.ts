import { Survey, SurveyResponse, QuestionType, TargetAudience } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}


export const getSurveys = async (): Promise<Survey[]> => {
  try {
    const surveys = await apiCall<Survey[]>('/surveys');
    return surveys;
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return [];
  }
};

export const getSurveyById = async (id: string): Promise<Survey | undefined> => {
  try {
    const survey = await apiCall<Survey>(`/surveys/${id}`);
    return survey;
  } catch (error) {
    console.error('Error fetching survey:', error);
    return undefined;
  }
};

export const saveSurvey = async (survey: Survey): Promise<void> => {
  try {
    await apiCall('/surveys', {
      method: 'POST',
      body: JSON.stringify(survey),
    });
  } catch (error) {
    console.error('Error saving survey:', error);
    throw error;
  }
};

// Special function to handle exclusive activation
export const updateSurveyStatus = async (
  id: string,
  shouldBeActive: boolean,
  audience: TargetAudience
): Promise<void> => {
  try {
    await apiCall(`/surveys/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ shouldBeActive, audience }),
    });
  } catch (error) {
    console.error('Error updating survey status:', error);
    throw error;
  }
};

export const deleteSurvey = async (id: string): Promise<void> => {
  try {
    await apiCall(`/surveys/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
};

export const saveResponse = async (response: SurveyResponse): Promise<void> => {
  try {
    await apiCall('/responses', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error('Error saving response:', error);
    throw error;
  }
};

export const getResponses = async (surveyId: string): Promise<SurveyResponse[]> => {
  try {
    const responses = await apiCall<SurveyResponse[]>(`/responses/survey/${surveyId}`);
    return responses;
  } catch (error) {
    console.error('Error fetching responses:', error);
    return [];
  }
};

// Admin Auth Helpers (still using localStorage for client-side auth)
export const checkAdminAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('insightflow_admin_auth') === 'true';
};

export const setAdminAuth = (isRemembered: boolean) => {
  if (typeof window === 'undefined') return;
  if (isRemembered) {
    localStorage.setItem('insightflow_admin_auth', 'true');
  } else {
    localStorage.removeItem('insightflow_admin_auth');
  }
};
