import type React from 'react';

// New types for Multi-Tenant Architecture
export interface Account {
  id: string;
  name: string;
  type: 'agency' | 'client';
  geminiApiKey?: string;
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  whatsappInstanceId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Made optional for type safety, but should always exist
  isActive: boolean;
  avatarUrl: string;
  accountId: string;
  role: 'agency' | 'client';
}


export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  accountId: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // For 'select' type
}

export interface Client { 
  id: string;
  accountId: string;
  name: string;
  email: string;
  avatarUrl: string;
  listId: string;
  customFields: Record<string, any>;
  createdAt: string; // ISO Date String
}

export interface List {
  id: string;
  accountId: string;
  name: string;
}

export interface WebViewItem {
  id: string;
  accountId: string;
  title: string;
  url: string;
}

export interface Service {
    id: string;
    accountId: string;
    name: string;
    description: string;
    price: number;
}

export interface Subscription {
    id: string;
    accountId: string;
    clientId: string;
    serviceId: string;
    startDate: string; // YYYY-MM-DD
    recurrence: 'monthly' | 'yearly';
    status: 'active' | 'paused' | 'cancelled';
    createdAt: string; // ISO Date String
}

export interface OneOffJob {
  id: string;
  accountId: string;
  clientId: string;
  title: string;
  description: string;
  value: number;
  dueDate: string; // YYY-MM-DD
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Pago';
  createdAt: string; // ISO Date String
}


export interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
}

export interface Task {
  id:string;
  accountId: string;
  title: string;
  clientId: string | null;
  dueDate: string | null; // ISO Date String
  isCompleted: boolean;
  createdAt: string; // ISO Date String
}

// --- Automation Types ---

export type TriggerType =
  | 'new_client_created'
  | 'client_moved_to_list'
  | 'new_subscription_created'
  | 'subscription_status_changed'
  | 'one_off_job_status_changed'
  | 'scheduled_weekly_check';

export type ConditionOperator = 
  | 'equals' | 'not_equals' | 'contains' | 'not_contains' 
  | 'is_greater_than' | 'is_less_than';

export interface Condition {
  fieldId: string;
  operator: ConditionOperator;
  value: any;
}

export type ActionType = 'webhook' | 'create_task' | 'update_field' | 'move_client' | 'send_whatsapp' | 'delay'; // Added 'delay'

export interface WebhookAction { type: 'webhook'; url: string; method: 'GET' | 'POST'; bodyTemplate?: string; }
export interface CreateTaskAction { type: 'create_task'; titleTemplate: string; dueDays: number; }
export interface UpdateFieldAction { type: 'update_field'; fieldId: string; valueTemplate: string; }
export interface MoveClientAction { type: 'move_client'; targetListId: string; }
export interface SendWhatsAppAction { type: 'send_whatsapp', phoneFieldId: string, messageTemplate: string }
export interface DelayAction { type: 'delay', days: number } // New Delay Action type
export type AutomationAction = WebhookAction | CreateTaskAction | UpdateFieldAction | MoveClientAction | SendWhatsAppAction | DelayAction;

export interface Automation {
  id: string;
  accountId: string;
  name: string;
  triggerType: TriggerType;
  triggerFilters?: {
    listId?: string;
    status?: Subscription['status'] | OneOffJob['status'];
  };
  conditions: Condition[];
  actions: AutomationAction[]; // Changed from `action` to `actions` to support sequences
  enabled: boolean;
}

// --- New Types for Advanced Marketing ---

export interface ClientMessage {
  id: string;
  clientId: string;
  accountId: string;
  content: string;
  sender: 'user' | 'client'; // 'user' is the CRM user, 'client' is the end customer
  timestamp: string;
  analysis?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    intent: string;
    suggestedActions: string[];
  }
}

export interface ScheduledJob {
  id: string;
  automationId: string;
  contextData: Record<string, any>;
  executeAt: number; // Timestamp
  currentStep: number;
  accountId: string;
}

// --- Form Types ---
export type FormFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select';

export interface FormField {
    id: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    placeholder?: string;
    options?: string[]; // for select
    mapsToClientField?: string; // custom field id, or 'name'/'email'
}

export interface Form {
    id: string;
    accountId: string;
    name: string;
    title: string;
    description: string;
    fields: FormField[];
    destinationListId: string;
    submitButtonText: string;
    createdAt: string; // ISO Date String
    // Style properties
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    fontSize: 'sm' | 'md' | 'lg';
}

// --- Other Types ---

export interface Activity {
    id: string;
    type: 'client' | 'job' | 'subscription';
    text: string;
    date: string;
    icon: React.ReactNode;
}

export interface SWOTAnalysis {
  id: string;
  accountId: string;
  clientId: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
}

export interface QuestionnaireItem {
  question: string;
  answer: string;
}

export interface ClientQuestionnaire {
  accountId: string;
  clientId: string;
  questions: QuestionnaireItem[];
}

export interface BCGMatrixItem {
  id: string;
  name: string;
  marketShare: number; // 0-100
  marketGrowth: number; // 0-100
}

export interface BCGMatrixAnalysis {
  id: string;
  accountId: string;
  clientId: string;
  items: BCGMatrixItem[];
}

export interface GmbProfile {
  id: string;
  accountId: string;
  clientId: string;
  companyName: string;
  category: string;
  description: string;
  optimizedDescription: string;
  postIdeas: { title: string; content: string }[];
  serviceSuggestions: string[];
  reviewToAnalyze: string;
  reviewResponse: string;
}

export interface Persona {
    name: string;
    avatarUrl: string;
    age: number;
    jobTitle: string;
    location: string;
    bio: string;
    goals: string[];
    painPoints: string[];
    quote: string;
}

export interface PersonaAnalysis {
    id: string; // Will be clientId
    accountId: string;
    clientId: string;
    businessDescription: string;
    personas: Persona[];
}