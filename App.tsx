import React, { useState, useEffect, useMemo } from 'react';
import type { User, Account, Client, List, CustomFieldDefinition, WebViewItem, Service, Subscription, CalendarEvent, Automation, TriggerType, OneOffJob, Activity, Task, Condition, ConditionOperator, AutomationAction, SWOTAnalysis, ClientQuestionnaire, BCGMatrixAnalysis, GmbProfile, PersonaAnalysis, ClientMessage, ScheduledJob, DelayAction, Form } from './types';
import { initialClients, initialLists, initialCustomFields, initialWebViews, initialServices, initialSubscriptions, initialAutomations, initialOneOffJobs, initialTasks, initialSwotAnalyses, initialClientQuestionnaires, initialBcgAnalyses, initialGmbProfiles, initialAccounts, initialUsers, initialPersonas, initialClientMessages, initialScheduledJobs, initialForms } from './data/mock';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { ClientManager } from './components/ClientManager';
import { ServiceManager } from './components/ServiceManager';
import { SubscriptionManager } from './components/SubscriptionManager';
import { Settings } from './components/Settings';
import { WebviewArea } from './components/WebviewArea';
import { CalendarView } from './components/CalendarView';
import { AutomationsManager } from './components/AutomationsManager';
import { OneOffJobManager } from './components/OneOffJobManager';
import { TaskManager } from './components/TaskManager';
import { MarketingTools } from './components/MarketingTools';
import { Conversations } from './components/Conversations';
import { Login } from './components/Login';
import { FormManager } from './components/FormManager';
import { PublicForm } from './components/PublicForm';
import ICAL from 'ical.js';
import { GoogleGenAI, Type } from '@google/genai';

export type ViewType = 'dashboard' | 'kanban' | 'clients' | 'services' | 'subscriptions' | 'settings' | 'webview' | 'calendar' | 'automations' | 'oneOffJobs' | 'tasks' | 'marketingTools' | 'conversations' | 'forms';

const viewTitles: Record<ViewType, string> = {
    dashboard: 'Dashboard',
    conversations: 'Conversas',
    kanban: 'Kanban',
    clients: 'Clientes',
    services: 'Serviços',
    subscriptions: 'Assinaturas',
    oneOffJobs: 'Trabalhos Avulsos',
    automations: 'Automações',
    tasks: 'Tarefas',
    marketingTools: 'Ferramentas de Marketing',
    forms: 'Formulários',
    webview: 'Webview',
    calendar: 'Calendário',
    settings: 'Configurações',
};

// --- Helper Functions ---
const replacePlaceholders = (template: string, data: Record<string, any>): string => {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const keys = key.trim().split('.');
    let value: any = data;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return ''; 
      }
    }
    return value !== null && value !== undefined ? String(value) : '';
  });
};


const App: React.FC = () => {
  // Check for public form view
  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get('form_id');
  
  // --- AUTHENTICATION & MULTI-TENANT STATE ---
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string>('');

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  
  // --- GLOBAL DATA STATE ---
  const [allLists, setAllLists] = useState<List[]>(initialLists);
  const [allClients, setAllClients] = useState<Client[]>(initialClients);
  const [allCustomFields, setAllCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [allWebViews, setAllWebViews] = useState<WebViewItem[]>(initialWebViews);
  const [allServices, setAllServices] = useState<Service[]>(initialServices);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [allOneOffJobs, setAllOneOffJobs] = useState<OneOffJob[]>(initialOneOffJobs);
  const [allTasks, setAllTasks] = useState<Task[]>(initialTasks);
  const [allAutomations, setAllAutomations] = useState<Automation[]>(initialAutomations);
  const [allSwotAnalyses, setAllSwotAnalyses] = useState<SWOTAnalysis[]>(initialSwotAnalyses);
  const [allClientQuestionnaires, setAllClientQuestionnaires] = useState<ClientQuestionnaire[]>(initialClientQuestionnaires);
  const [allBcgAnalyses, setAllBcgAnalyses] = useState<BCGMatrixAnalysis[]>(initialBcgAnalyses);
  const [allGmbProfiles, setAllGmbProfiles] = useState<GmbProfile[]>(initialGmbProfiles);
  const [allPersonas, setAllPersonas] = useState<PersonaAnalysis[]>(initialPersonas);
  const [allClientMessages, setAllClientMessages] = useState<ClientMessage[]>(initialClientMessages);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>(initialScheduledJobs);
  const [allForms, setAllForms] = useState<Form[]>(initialForms);
  
  // --- DATA SELECTORS FOR CURRENT ACCOUNT ---
  const currentAccountData = useMemo(() => {
    const filter = <T extends { accountId: string }>(data: T[]) => data.filter(item => item.accountId === currentAccountId);
    const currentAccount = accounts.find(a => a.id === currentAccountId);
    return {
      lists: filter(allLists),
      clients: filter(allClients),
      customFields: filter(allCustomFields),
      webViews: filter(allWebViews),
      services: filter(allServices),
      subscriptions: filter(allSubscriptions),
      oneOffJobs: filter(allOneOffJobs),
      tasks: filter(allTasks),
      automations: filter(allAutomations),
      swotAnalyses: filter(allSwotAnalyses),
      clientQuestionnaires: filter(allClientQuestionnaires),
      bcgAnalyses: filter(allBcgAnalyses),
      gmbProfiles: filter(allGmbProfiles),
      personas: filter(allPersonas),
      clientMessages: filter(allClientMessages),
      forms: filter(allForms),
      account: currentAccount,
    };
  }, [currentAccountId, accounts, allLists, allClients, allCustomFields, allWebViews, allServices, allSubscriptions, allOneOffJobs, allTasks, allAutomations, allSwotAnalyses, allClientQuestionnaires, allBcgAnalyses, allGmbProfiles, allPersonas, allClientMessages, allForms]);

  const [calendarUrl, setCalendarUrl] = useState<string>('');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState<boolean>(false);

  const isAiAvailable = useMemo(() => {
      const currentAccount = accounts.find(a => a.id === currentAccountId);
      return !!currentAccount?.geminiApiKey;
  }, [accounts, currentAccountId]);

  // --- AI INSTANCE GETTER ---
  const getAiClient = (accountId: string): GoogleGenAI | null => {
    const account = accounts.find(a => a.id === accountId);
    if (account?.geminiApiKey) {
      return new GoogleGenAI({ apiKey: account.geminiApiKey });
    }
    return null;
  };

  const executeTriggers = async (triggerType: TriggerType, data: Record<string, any>, accountId: string) => {
    const matchingAutomations = allAutomations.filter(a =>
        a.accountId === accountId &&
        a.triggerType === triggerType &&
        a.enabled
    );

    for (const automation of matchingAutomations) {
        const newJob: ScheduledJob = {
            id: `job-${Date.now()}-${Math.random()}`,
            automationId: automation.id,
            contextData: data,
            executeAt: Date.now(),
            currentStep: 0,
            accountId: accountId,
        };
        setScheduledJobs(prev => [...prev, newJob]);
    }
  };

  const processJobQueue = async () => {
    const now = Date.now();
    const jobsToProcess = scheduledJobs.filter(job => job.executeAt <= now);
    if (jobsToProcess.length === 0) return;

    let remainingJobs = [...scheduledJobs];
    let updatedClients = [...allClients]; // To batch updates

    for (const job of jobsToProcess) {
        const automation = allAutomations.find(a => a.id === job.automationId);
        if (!automation || !automation.enabled) {
            remainingJobs = remainingJobs.filter(j => j.id !== job.id);
            continue;
        }

        const action = automation.actions[job.currentStep];
        if (!action) { // End of sequence
            remainingJobs = remainingJobs.filter(j => j.id !== job.id);
            continue;
        }

        const clientForAction = allClients.find(c => c.id === (job.contextData.client?.id || job.contextData.subscription?.clientId || job.contextData.oneOffJob?.clientId));
        const fullContextData = { client: clientForAction, list: allLists.find(l => l.id === clientForAction?.listId), ...job.contextData };
        
        // Condition Check
        let conditionsMet = true;
        if (automation.conditions.length > 0) {
          if (!clientForAction) {
            conditionsMet = false;
          } else {
            for (const condition of automation.conditions) {
              const clientValue = clientForAction.customFields[condition.fieldId];
              // Implement logic for each operator
              if (String(clientValue) != condition.value) { // Simplified check
                conditionsMet = false;
                break;
              }
            }
          }
        }
        
        if (!conditionsMet) {
          remainingJobs = remainingJobs.filter(j => j.id !== job.id); // Abort sequence
          continue;
        }

        switch (action.type) {
            case 'delay':
                const newExecuteAt = now + action.days * 24 * 60 * 60 * 1000;
                remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, executeAt: newExecuteAt, currentStep: j.currentStep + 1} : j);
                break;
            case 'create_task':
                const newTask: Omit<Task, 'id'|'createdAt'|'accountId'|'isCompleted'> = {
                    title: replacePlaceholders(action.titleTemplate, fullContextData),
                    clientId: clientForAction?.id || null,
                    dueDate: new Date(Date.now() + action.dueDays * 24 * 60 * 60 * 1000).toISOString(),
                };
                setAllTasks(p => [...p, { ...newTask, id: `task-${Date.now()}`, isCompleted: false, createdAt: new Date().toISOString(), accountId: job.accountId }]);
                remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, currentStep: j.currentStep + 1, executeAt: now } : j);
                break;
             case 'move_client':
                 if (clientForAction) {
                     updatedClients = updatedClients.map(c => c.id === clientForAction.id ? { ...c, listId: action.targetListId } : c);
                 }
                 remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, currentStep: j.currentStep + 1, executeAt: now } : j);
                 break;
            case 'update_field':
                 if (clientForAction) {
                    const newValue = replacePlaceholders(action.valueTemplate, fullContextData);
                    updatedClients = updatedClients.map(c => c.id === clientForAction.id ? { ...c, customFields: { ...c.customFields, [action.fieldId]: newValue } } : c);
                 }
                 remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, currentStep: j.currentStep + 1, executeAt: now } : j);
                 break;
            case 'send_whatsapp':
                if (clientForAction) {
                    const account = accounts.find(a => a.id === job.accountId);
                    const phoneNumber = clientForAction.customFields[action.phoneFieldId];
                    if (account?.whatsappApiUrl && phoneNumber) {
                       // Fire-and-forget API call
                       fetch(account.whatsappApiUrl, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json', 'X-API-TOKEN': account.whatsappApiKey || '' },
                           body: JSON.stringify({
                               from: account.whatsappInstanceId,
                               to: phoneNumber,
                               contents: [{ type: 'text', text: replacePlaceholders(action.messageTemplate, fullContextData) }]
                           })
                       }).catch(console.error);
                    }
                }
                remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, currentStep: j.currentStep + 1, executeAt: now } : j);
                break;
            default:
                 remainingJobs = remainingJobs.map(j => j.id === job.id ? {...j, currentStep: j.currentStep + 1, executeAt: now } : j);
                 break;
        }
    }
    setScheduledJobs(remainingJobs);
    setAllClients(updatedClients); // Apply batched client updates
  };
  
  // Effect for job queue processing
  useEffect(() => {
      const interval = setInterval(processJobQueue, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
  }, [scheduledJobs, allClients, allAutomations, accounts]);


  useEffect(() => {
    // Reset view to dashboard when switching accounts
    if (currentUser) {
        setCurrentView('dashboard');
    }
  }, [currentAccountId, currentUser]);
  
  // Effect for processing form submissions from localStorage
  useEffect(() => {
    const processSubmissions = () => {
      try {
        const submissionsStr = localStorage.getItem('creapar_form_submissions');
        if (submissionsStr) {
          const submissions = JSON.parse(submissionsStr);
          if (Array.isArray(submissions) && submissions.length > 0) {
            let newClients: Client[] = [];
            submissions.forEach((sub: any) => {
              const form = allForms.find(f => f.id === sub.formId);
              if (form) {
                const customFields: Record<string, any> = {};
                
                form.fields.forEach(field => {
                  const value = sub.formData[field.id];
                  if (value && field.mapsToClientField) {
                     if (field.mapsToClientField !== 'name' && field.mapsToClientField !== 'email') {
                       customFields[field.mapsToClientField] = value;
                     }
                  }
                });

                const newClient: Client = {
                  name: sub.formData.name || 'Novo Lead do Formulário',
                  email: sub.formData.email || '',
                  listId: form.destinationListId,
                  customFields: customFields,
                  id: `client-${Date.now()}-${Math.random()}`,
                  avatarUrl: `https://i.pravatar.cc/100?u=client-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                  accountId: form.accountId,
                };
                newClients.push(newClient);
              }
            });
            
            if (newClients.length > 0) {
                setAllClients(prev => [...prev, ...newClients]);
                // We could execute triggers here for each new client if needed.
            }
            localStorage.setItem('creapar_form_submissions', JSON.stringify([]));
          }
        }
      } catch (error) {
          console.error("Error processing form submissions:", error);
          localStorage.setItem('creapar_form_submissions', JSON.stringify([]));
      }
    };
    
    const interval = setInterval(processSubmissions, 5000);
    return () => clearInterval(interval);
  }, [allForms]); // Dependency ensures it has the latest form configs


  const handleLogin = (email: string, password: string):string => {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user && user.password === password) {
          if (!user.isActive) {
              return "Sua conta está inativa. Contate o administrador.";
          }
          setCurrentUser(user);
          setCurrentAccountId(user.accountId);
          return "success";
      }
      return "Email ou senha inválidos.";
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentAccountId('');
  };

  const addList = (name: string) => setAllLists(p => [...p, { id: `list-${Date.now()}`, name, accountId: currentAccountId }]);
  const updateList = (listId: string, newName: string) => setAllLists(p => p.map(l => (l.id === listId && l.accountId === currentAccountId) ? { ...l, name: newName } : l));
  const deleteList = (listId: string) => {
    const clientsInList = allClients.some(c => c.listId === listId && c.accountId === currentAccountId);
    if(clientsInList) {
        alert("Não é possível excluir uma etapa que contém clientes. Mova os clientes para outra etapa primeiro.");
        return;
    }
    setAllLists(p => p.filter(l => l.id !== listId));
  };
  
  const addClient = (client: Omit<Client, 'id' | 'avatarUrl' | 'createdAt' | 'accountId'>) => {
    const newClient = {
        ...client,
        id: `client-${Date.now()}`,
        avatarUrl: `https://i.pravatar.cc/100?u=client-${Date.now()}`,
        createdAt: new Date().toISOString(),
        accountId: currentAccountId
    };
    setAllClients(p => [...p, newClient]);
    executeTriggers('new_client_created', { client: newClient }, newClient.accountId);
  };
  const updateClient = (updatedClient: Client) => setAllClients(p => p.map(c => c.id === updatedClient.id ? updatedClient : c));
  const deleteClient = (clientId: string) => {
    if(!confirm("Tem certeza que deseja excluir este cliente e todos os seus dados associados (assinaturas, trabalhos, etc)?")) return;
    setAllSubscriptions(p => p.filter(s => s.clientId !== clientId));
    setAllOneOffJobs(p => p.filter(j => j.clientId !== clientId));
    setAllTasks(p => p.filter(t => t.clientId !== clientId));
    setAllSwotAnalyses(p => p.filter(s => s.clientId !== clientId));
    setAllClientQuestionnaires(p => p.filter(q => q.clientId !== q.clientId));
    setAllBcgAnalyses(p => p.filter(b => b.clientId !== b.clientId));
    setAllGmbProfiles(p => p.filter(g => g.clientId !== g.clientId));
    setAllPersonas(p => p.filter(pa => pa.clientId !== pa.clientId));
    setAllClients(p => p.filter(c => c.id !== clientId));
  };

  const updateClientList = (clientId: string, newListId: string) => {
    let updatedClient: Client | undefined;
    setAllClients(prevClients => {
        const newClients = prevClients.map(c => {
            if (c.id === clientId) {
                updatedClient = { ...c, listId: newListId };
                return updatedClient;
            }
            return c;
        });
        return newClients;
    });

    if (updatedClient) {
        executeTriggers('client_moved_to_list', { client: updatedClient, listId: newListId }, updatedClient.accountId);
    }
  };

  const updateUserAccess = (userId: string, isActive: boolean) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive } : u));
  };
  const resetUserPassword = (userId: string, newPassword: string) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
  };

  const deleteUserAndAccount = (accountIdToDelete: string) => {
      setAllClients(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllLists(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllCustomFields(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllServices(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllSubscriptions(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllOneOffJobs(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllTasks(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllAutomations(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllSwotAnalyses(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllClientQuestionnaires(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllBcgAnalyses(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllGmbProfiles(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllPersonas(p => p.filter(item => item.accountId !== accountIdToDelete));
      setAllWebViews(p => p.filter(item => item.accountId !== accountIdToDelete));
      setUsers(p => p.filter(u => u.accountId !== accountIdToDelete));
      setAccounts(p => p.filter(a => a.id !== accountIdToDelete));
  };
  
  const addUserAndAccount = (accountName: string, userName: string, userEmail: string, userPassword: string): {success: boolean, message: string} => {
      if (users.some(u => u.email.toLowerCase() === userEmail.toLowerCase())) {
          return { success: false, message: 'Este email já está em uso.' };
      }
      const newAccountId = `acc-${Date.now()}`;
      const newAccount: Account = { id: newAccountId, name: accountName, type: 'client', geminiApiKey: '' };
      const newUser: User = { id: `user-${Date.now()}`, name: userName, email: userEmail, password: userPassword, isActive: true, avatarUrl: `https://i.pravatar.cc/100?u=${newAccountId}`, accountId: newAccountId, role: 'client' };
      
      setAccounts(p => [...p, newAccount]);
      setUsers(p => [...p, newUser]);
      return { success: true, message: 'Conta criada com sucesso!' };
  };

  const addCustomField = (field: Omit<CustomFieldDefinition, 'id' | 'accountId'>) => setAllCustomFields(p => [...p, { ...field, id: `field-${Date.now()}`, accountId: currentAccountId }]);
  const updateService = (updatedService: Service) => setAllServices(p => p.map(s => s.id === updatedService.id ? updatedService : s));
  const addService = (service: Omit<Service, 'id' | 'accountId'>) => setAllServices(p => [...p, { ...service, id: `service-${Date.now()}`, accountId: currentAccountId }]);
  const deleteService = (serviceId: string) => setAllServices(p => p.filter(s => s.id !== serviceId));
  const addSubscription = (sub: Omit<Subscription, 'id'|'createdAt'|'accountId'>) => {
    const newSub: Subscription = { ...sub, id: `sub-${Date.now()}`, createdAt: new Date().toISOString(), accountId: currentAccountId };
    setAllSubscriptions(p => [...p, newSub]);
    executeTriggers('new_subscription_created', { subscription: newSub }, newSub.accountId);
  };
  const updateSubscription = (updatedSub: Subscription) => {
    const oldSub = allSubscriptions.find(s => s.id === updatedSub.id);
    setAllSubscriptions(p => p.map(s => (s.id === updatedSub.id ? updatedSub : s)));
    if (oldSub && oldSub.status !== updatedSub.status) {
        executeTriggers('subscription_status_changed', { subscription: updatedSub }, updatedSub.accountId);
    }
  };
  const deleteSubscription = (subscriptionId: string) => setAllSubscriptions(p => p.filter(s => s.id !== subscriptionId));

  const addOneOffJob = (job: Omit<OneOffJob, 'id'|'createdAt'|'accountId'>) => setAllOneOffJobs(p => [...p, { ...job, id: `job-${Date.now()}`, createdAt: new Date().toISOString(), accountId: currentAccountId }]);
  const updateOneOffJob = (updatedJob: OneOffJob) => {
    const oldJob = allOneOffJobs.find(j => j.id === updatedJob.id);
    setAllOneOffJobs(p => p.map(j => (j.id === updatedJob.id ? updatedJob : j)));
    if (oldJob && oldJob.status !== updatedJob.status) {
        executeTriggers('one_off_job_status_changed', { oneOffJob: updatedJob }, updatedJob.accountId);
    }
  };
  const deleteOneOffJob = (jobId: string) => setAllOneOffJobs(p => p.filter(j => j.id !== jobId));
  const addTask = (task: Omit<Task, 'id'|'createdAt'|'accountId'|'isCompleted'>) => setAllTasks(p => [...p, { ...task, id: `task-${Date.now()}`, isCompleted: false, createdAt: new Date().toISOString(), accountId: currentAccountId }]);
  const updateTask = (updatedTask: Task) => setAllTasks(p => p.map(t => t.id === updatedTask.id ? updatedTask : t));
  const deleteTask = (taskId: string) => setAllTasks(p => p.filter(t => t.id !== taskId));

  const addAutomation = (automation: Omit<Automation, 'id'|'accountId'>) => setAllAutomations(p => [...p, { ...automation, id: `auto-${Date.now()}`, accountId: currentAccountId }]);
  const updateAutomation = (updatedAutomation: Automation) => setAllAutomations(p => p.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
  const deleteAutomation = (automationId: string) => setAllAutomations(p => p.filter(a => a.id !== automationId));
  const saveSwotAnalysis = (analysisData: Omit<SWOTAnalysis, 'id'|'accountId'> | SWOTAnalysis) => {
    if ('id' in analysisData && analysisData.id) {
      setAllSwotAnalyses(p => p.map(s => s.id === analysisData.id ? analysisData : s));
    } else {
      const newAnalysis = { ...analysisData, id: `swot-${Date.now()}`, accountId: currentAccountId };
      setAllSwotAnalyses(p => [...p.filter(s => s.clientId !== newAnalysis.clientId), newAnalysis]);
    }
  };
  const saveClientQuestionnaire = (q: ClientQuestionnaire) => setAllClientQuestionnaires(p => [...p.filter(i => i.clientId !== q.clientId), { ...q, accountId: currentAccountId }]);
  const saveBcgAnalysis = (b: BCGMatrixAnalysis) => setAllBcgAnalyses(p => [...p.filter(i => i.clientId !== b.clientId), { ...b, accountId: currentAccountId }]);
  const saveGmbProfile = (g: GmbProfile) => setAllGmbProfiles(p => [...p.filter(i => i.clientId !== g.clientId), { ...g, accountId: currentAccountId }]);
  const saveCalendarUrl = (url: string) => {
    setCalendarUrl(url);
    if (!url) {
      setCalendarEvents([]);
      setCalendarError(null);
      return;
    }
    fetchCalendarEvents(url);
  };
    
  const fetchCalendarEvents = async (url: string) => {
      setIsCalendarLoading(true);
      setCalendarError(null);
      try {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const jcalData = ICAL.parse(text);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');
        const events = vevents.map((vevent: any) => {
            const event = new ICAL.Event(vevent);
            return {
                title: event.summary,
                start: event.startDate.toJSDate(),
                end: event.endDate.toJSDate(),
                allDay: event.startDate.isDate,
            };
        });
        setCalendarEvents(events);
      } catch (e: any) {
        console.error('Failed to fetch calendar:', e);
        setCalendarError('Não foi possível buscar os eventos. Verifique se a URL está correta e é pública. Erros de CORS podem ocorrer.');
      } finally {
        setIsCalendarLoading(false);
      }
  };
  
  const saveAccountApiKey = async (accountId: string, apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
      setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, geminiApiKey: '' } : acc));
      return { success: true, message: 'Chave de API removida.' };
    }
    // Validation
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({model: 'gemini-2.5-flash', contents: 'validar'});
      setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, geminiApiKey: apiKey } : acc));
      return { success: true, message: 'Chave de API salva e validada com sucesso!' };
    } catch (error) {
      console.error("API Key validation failed:", error);
      return { success: false, message: 'A chave de API fornecida é inválida.' };
    }
  };

  const saveWhatsAppConfig = async (accountId: string, config: { apiUrl: string, apiKey: string, instanceId: string, testNumber?: string }): Promise<{ success: boolean; message: string }> => {
    setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, whatsappApiUrl: config.apiUrl, whatsappApiKey: config.apiKey, whatsappInstanceId: config.instanceId } : acc));
    
    if (config.testNumber) {
        try {
            const payload = { from: config.instanceId, to: config.testNumber, contents: [{ type: 'text', text: 'Esta é uma mensagem de teste do Creapar CRM.' }] };
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-TOKEN': config.apiKey },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('A API retornou um erro.');
            return { success: true, message: 'Configuração salva e mensagem de teste enviada com sucesso!' };
        } catch (error) {
            console.error("WhatsApp test message failed:", error);
            return { success: false, message: 'Configuração salva, mas a mensagem de teste falhou. Verifique as credenciais e a URL.' };
        }
    }
    return { success: true, message: 'Configuração salva com sucesso (teste não enviado).' };
  };

  const addClientMessage = (clientId: string, content: string) => {
    const newMessage: ClientMessage = {
        id: `msg-${Date.now()}`,
        clientId,
        accountId: currentAccountId,
        content,
        sender: 'client',
        timestamp: new Date().toISOString(),
    };
    setAllClientMessages(prev => [...prev, newMessage]);
  };
  
  const analyzeClientMessage = async (messageId: string): Promise<void> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) throw new Error("AI client not initialized.");
    
    const message = allClientMessages.find(m => m.id === messageId);
    if (!message) throw new Error("Message not found.");

    const prompt = `Analise a seguinte mensagem de um cliente e extraia o sentimento, a intenção principal e sugira 2-3 próximas ações acionáveis para um atendente de CRM.
    Mensagem: "${message.content}"
    
    O sentimento pode ser 'positive', 'negative', ou 'neutral'.
    A intenção deve ser uma frase curta descrevendo o que o cliente quer (ex: "Pedindo orçamento", "Reclamando sobre serviço", "Agendando reunião").
    As ações sugeridas devem ser frases curtas e diretas (ex: "Criar tarefa para ligar", "Enviar link da documentação", "Atualizar campo 'Status' para 'Interessado'").`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            sentiment: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
            intent: { type: Type.STRING },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["sentiment", "intent", "suggestedActions"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const analysisResult = JSON.parse(response.text);

        setAllClientMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, analysis: analysisResult } : m
        ));
    } catch (e) {
        console.error("Error analyzing client message:", e);
        throw e;
    }
  };


  // --- AI Functions ---
  const savePersonaAnalysis = (analysis: PersonaAnalysis) => {
    setAllPersonas(prev => {
        const existingIndex = prev.findIndex(p => p.clientId === analysis.clientId && p.accountId === analysis.accountId);
        if (existingIndex > -1) {
            const newArray = [...prev];
            newArray[existingIndex] = analysis;
            return newArray;
        }
        return [...prev, analysis];
    });
  };

  const deletePersonaAnalysis = (clientId: string) => {
      setAllPersonas(p => p.filter(pa => !(pa.clientId === clientId && pa.accountId === currentAccountId)));
  };

  const generatePersonas = async (clientId: string, businessDescription: string): Promise<void> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) throw new Error("AI client not initialized for this account.");

    const personaSchema = {
      type: Type.OBJECT,
      properties: {
        personas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nome fictício da persona (ex: 'Ana a Analista')." },
              avatarUrl: { type: Type.STRING, description: "URL de um avatar aleatório de https://i.pravatar.cc/150." },
              age: { type: Type.INTEGER, description: "Idade da persona." },
              jobTitle: { type: Type.STRING, description: "Cargo ou profissão da persona." },
              location: { type: Type.STRING, description: "Cidade e estado da persona." },
              bio: { type: Type.STRING, description: "Uma curta biografia de 2-3 frases sobre a persona, seus hobbies e estilo de vida." },
              goals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 2 a 3 objetivos principais da persona relacionados ao negócio." },
              painPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 2 a 3 dores ou frustrações principais que o negócio pode resolver." },
              quote: { type: Type.STRING, description: "Uma citação curta que resume a mentalidade da persona." },
            },
            required: ["name", "avatarUrl", "age", "jobTitle", "location", "bio", "goals", "painPoints", "quote"],
          },
        },
      },
      required: ["personas"],
    };

    const prompt = `Com base na seguinte descrição de um negócio e seu público-alvo, crie 3 perfis de Buyer Persona distintos e detalhados. O público-alvo é: "${businessDescription}". Retorne a resposta em formato JSON, seguindo o schema fornecido.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: personaSchema,
            },
        });
      
        const resultJson = JSON.parse(response.text);
        
        const newAnalysis: PersonaAnalysis = {
            id: clientId,
            clientId,
            accountId: currentAccountId,
            businessDescription,
            personas: resultJson.personas,
        };
        savePersonaAnalysis(newAnalysis);

    } catch (e) {
      console.error("Error generating personas with AI:", e);
      throw e;
    }
  };

  const generateWhatsAppTemplate = async (objective: string): Promise<string> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return "AI not available.";
    const prompt = `Crie uma mensagem curta e profissional para WhatsApp com o seguinte objetivo: "${objective}". Use placeholders como {{client.name}} para personalização. A mensagem deve ser amigável e terminar com uma chamada para ação clara.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Error generating WhatsApp template:", e);
        return "Erro ao gerar template.";
    }
  };


  const analyzeClientPortfolio = async (): Promise<string> => {
    const ai = getAiClient(currentUser!.accountId); // Agency's own key
    if (!ai) return "A funcionalidade de IA não está disponível. Configure a chave de API da sua agência.";
    
    const clientAccounts = accounts.filter(a => a.type === 'client');
    const totalRevenue = allSubscriptions
        .filter(sub => sub.status === 'active')
        .reduce((sum, sub) => sum + (allServices.find(s => s.id === sub.serviceId)?.price || 0), 0);
    const totalPaidJobs = allOneOffJobs
        .filter(j => j.status === 'Pago')
        .reduce((sum, j) => sum + j.value, 0);

    const funnelDistribution = allLists
        .filter(list => clientAccounts.some(acc => acc.id === list.accountId)) // Consider lists from all client accounts
        .map(list => {
            const clientCount = allClients.filter(c => c.listId === list.id).length;
            const account = accounts.find(a => a.id === list.accountId);
            return { name: `${list.name} (${account?.name})`, count: clientCount };
        }).filter(l => l.count > 0);

    const dataSummary = `
        - Número total de contas de clientes: ${clientAccounts.length}
        - Total de leads/clientes gerenciados: ${allClients.length}
        - Receita recorrente mensal total (MRR): ${totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        - Faturamento total com trabalhos avulsos pagos: ${totalPaidJobs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        - Distribuição de clientes pelo funil (agregado): ${JSON.stringify(funnelDistribution)}
    `;

    const prompt = `Você é um consultor de negócios para uma agência de marketing que usa um CRM. Analise os seguintes dados agregados do portfólio de clientes da agência e forneça uma análise estratégica.

    Dados Agregados:
    ${dataSummary}

    Sua análise deve conter:
    1.  **Resumo Executivo:** Uma visão geral rápida da saúde do portfólio.
    2.  **Pontos Fortes:** O que a agência está fazendo bem?
    3.  **Oportunidades de Melhoria:** Onde estão os gargalos ou áreas para crescimento? (Ex: muitos leads parados em uma etapa, baixo MRR em comparação com o número de clientes).
    4.  **Recomendações Acionáveis:** 2-3 ações claras que a agência pode tomar para melhorar seus resultados.

    Seja conciso, profissional e foque em insights de negócios. Formate a resposta usando markdown.`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Error analyzing client portfolio:", e);
        return "Erro ao gerar análise do portfólio.";
    }
  };

  const generateClientReport = async (accountId: string): Promise<string> => {
    const ai = getAiClient(currentUser!.accountId); // Agency's own key
    if (!ai) return "A funcionalidade de IA não está disponível.";
    
    const accountClients = allClients.filter(c => c.accountId === accountId);
    const accountSubscriptions = allSubscriptions.filter(s => s.accountId === accountId);
    const accountServices = allServices.filter(s => s.accountId === accountId);
    const accountJobs = allOneOffJobs.filter(j => j.accountId === accountId);
    
    const mrr = accountSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (accountServices.find(srv => srv.id === s.serviceId)?.price || 0), 0);

    const paidJobsValue = accountJobs
        .filter(j => j.status === 'Pago')
        .reduce((sum, j) => sum + j.value, 0);
        
    const dataSummary = `
        - Total de leads/clientes no CRM: ${accountClients.length}
        - Receita recorrente mensal (MRR): ${mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        - Faturamento com trabalhos avulsos pagos: ${paidJobsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
    `;

    const prompt = `Crie um relatório de desempenho conciso e profissional para um cliente de uma agência de marketing.
    
    Dados do cliente:
    ${dataSummary}

    O relatório deve ter:
    1.  **Título:** Relatório de Desempenho
    2.  **Resumo:** Uma breve análise dos resultados.
    3.  **Métricas Chave:** Apresente os dados de forma clara.
    4.  **Próximos Passos Sugeridos:** 1-2 sugestões para o próximo período.

    Seja positivo e profissional. Formate a resposta usando markdown.`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Error generating client report:", e);
        return "Erro ao gerar relatório do cliente.";
    }
  };

  const generateQuestionnaire = async (clientId: string) => {
    const ai = getAiClient(currentAccountId);
    if (!ai) throw new Error("AI client not initialized for this account.");
    const client = allClients.find(c => c.id === clientId);
    if (!client) throw new Error("Client not found");

    const clientServices = allSubscriptions
      .filter(s => s.clientId === clientId && s.status === 'active')
      .map(s => allServices.find(srv => srv.id === s.serviceId)?.name)
      .filter(Boolean);

    const prompt = `Crie um questionário estratégico com 5 a 7 perguntas abertas para uma análise SWOT de um cliente. O objetivo é entender os pontos fortes, fracos, oportunidades e ameaças do negócio dele.
    Cliente: ${client.name}.
    Serviços que ele contrata de nós: ${clientServices.join(', ') || 'Nenhum listado'}.
    As perguntas devem ser perspicazes e adaptadas para um negócio. Retorne a resposta como um JSON com uma chave "questions" contendo um array de strings.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ['questions']
    };
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const resultJson = JSON.parse(response.text);
        const newQuestionnaire: ClientQuestionnaire = {
            clientId,
            accountId: currentAccountId,
            questions: resultJson.questions.map((q: string) => ({ question: q, answer: '' })),
        };
        saveClientQuestionnaire(newQuestionnaire);
    } catch (e) {
        console.error("Error generating questionnaire:", e);
        throw e;
    }
  };

  const analyzeAndCreateSwot = async (questionnaire: ClientQuestionnaire) => {
    const ai = getAiClient(currentAccountId);
    if (!ai) throw new Error("AI client not initialized for this account.");
    
    const qaText = questionnaire.questions.map(q => `Pergunta: ${q.question}\nResposta: ${q.answer}`).join('\n\n');
    const prompt = `Analise o seguinte questionário preenchido e crie uma análise SWOT concisa. Para cada quadrante (Forças, Fraquezas, Oportunidades, Ameaças), liste 2 a 3 pontos principais em formato de bullet points.
    Questionário:\n${qaText}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: { type: Type.STRING, description: "Pontos fortes (bullet points)." },
            weaknesses: { type: Type.STRING, description: "Pontos fracos (bullet points)." },
            opportunities: { type: Type.STRING, description: "Oportunidades (bullet points)." },
            threats: { type: Type.STRING, description: "Ameaças (bullet points)." },
        },
        required: ["strengths", "weaknesses", "opportunities", "threats"],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const resultJson = JSON.parse(response.text);
        const swotData = {
            clientId: questionnaire.clientId,
            ...resultJson
        };
        saveSwotAnalysis(swotData);
    } catch (e) {
        console.error("Error analyzing SWOT:", e);
        throw e;
    }
  };

  const estimateBcgMetrics = async (productName: string): Promise<{ marketShare: number; marketGrowth: number } | null> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return null;
    const prompt = `Estime a 'participação de mercado' (marketShare) e o 'crescimento de mercado' (marketGrowth) para o seguinte produto/serviço: "${productName}". Retorne valores de 0 a 100 para cada. A resposta deve ser uma estimativa para fins de análise estratégica.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            marketShare: { type: Type.INTEGER, description: "Participação de mercado estimada (0-100)." },
            marketGrowth: { type: Type.INTEGER, description: "Crescimento de mercado estimado (0-100)." },
        },
        required: ["marketShare", "marketGrowth"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const result = JSON.parse(response.text);
        return {
            marketShare: Math.max(0, Math.min(100, result.marketShare)),
            marketGrowth: Math.max(0, Math.min(100, result.marketGrowth)),
        };
    } catch (e) {
        console.error("Error estimating BCG metrics:", e);
        return null;
    }
  };

  const optimizeGmbDescription = async (category: string, description: string): Promise<string> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return "AI not available.";
    const prompt = `Re-escreva a seguinte descrição para um perfil do Google Meu Negócio de um '${category}' para maximizar o SEO local, ser mais atraente e informativo. Mantenha-o abaixo de 750 caracteres. Descrição atual: "${description}"`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Error optimizing GMB description:", e);
        return "Erro ao otimizar a descrição.";
    }
  };

  const generateGmbPostIdeas = async (category: string, name: string): Promise<{ title: string; content: string }[]> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return [];
    const prompt = `Crie 3 ideias de posts curtos e engajadores para o Google Meu Negócio de uma '${category}' chamada '${name}'. Inclua um título e o conteúdo para cada post.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            posts: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ["title", "content"]
                }
            }
        },
        required: ["posts"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        return JSON.parse(response.text).posts;
    } catch (e) {
        console.error("Error generating GMB post ideas:", e);
        return [];
    }
  };

  const suggestGmbServices = async (category: string, description: string): Promise<string[]> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return [];
    const prompt = `Baseado na descrição "${description}" e na categoria "${category}", liste de 5 a 10 serviços específicos que esta empresa deveria adicionar ao seu perfil do Google Meu Negócio para melhorar a relevância.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            services: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["services"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        return JSON.parse(response.text).services;
    } catch (e) {
        console.error("Error suggesting GMB services:", e);
        return [];
    }
  };

  const generateGmbReviewResponse = async (reviewText: string, isPositive: boolean): Promise<string> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return "AI not available.";
    const prompt = `Escreva uma resposta profissional e amigável para a seguinte avaliação ${isPositive ? 'positiva' : 'negativa'} recebida por uma empresa. A resposta deve ser apropriada para ser publicada no Google Meu Negócio. Avaliação: "${reviewText}"`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Error generating GMB review response:", e);
        return "Erro ao gerar resposta.";
    }
  };

  const generateDripCampaign = async (objective: string): Promise<Omit<Automation, 'id'|'accountId'|'enabled'>> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) throw new Error("AI client not initialized for this account.");

    const actionSchema = {
        type: Type.OBJECT,
        properties: {
            type: {
                type: Type.STRING,
                enum: ['delay', 'send_whatsapp', 'create_task'],
                description: "O tipo de ação. Use 'delay' para aguardar, 'send_whatsapp' para enviar mensagem, 'create_task' para criar tarefa."
            },
            days: {
                type: Type.INTEGER,
                description: "Apenas para o tipo 'delay'. Número de dias para aguardar."
            },
            messageTemplate: {
                type: Type.STRING,
                description: "Apenas para o tipo 'send_whatsapp'. Conteúdo da mensagem. Use {{client.name}}."
            },
            titleTemplate: {
                type: Type.STRING,
                description: "Apenas para o tipo 'create_task'. Título da tarefa. Use {{client.name}}."
            },
            dueDays: {
                type: Type.INTEGER,
                description: "Apenas para o tipo 'create_task'. Prazo em dias para a tarefa."
            },
        },
        required: ['type']
    };

    const campaignSchema = {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "Um nome criativo e descritivo para a campanha de automação."
            },
            actions: {
                type: Type.ARRAY,
                description: "Uma sequência de ações. A primeira ação não deve ser um 'delay'.",
                items: actionSchema
            }
        },
        required: ["name", "actions"],
    };

    const prompt = `Com base no seguinte objetivo, crie uma campanha de automação de marketing (drip campaign).
    Objetivo: "${objective}".
    A campanha deve ter um nome e uma sequência de pelo menos 3 ações (ex: enviar mensagem, aguardar, enviar outra mensagem).
    As ações podem ser 'send_whatsapp', 'delay', ou 'create_task'.
    Use placeholders como {{client.name}} nos templates de texto.
    A primeira ação não deve ser um 'delay'.
    Retorne a resposta no formato JSON seguindo o schema fornecido.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: campaignSchema,
            },
        });
      
        const resultJson = JSON.parse(response.text);
        
        const cleanedActions: AutomationAction[] = resultJson.actions.map((action: any) => {
            switch(action.type) {
                case 'delay':
                    return { type: 'delay', days: action.days || 1 };
                case 'send_whatsapp':
                    return { type: 'send_whatsapp', messageTemplate: action.messageTemplate || 'Mensagem de exemplo.', phoneFieldId: 'field-phone' };
                case 'create_task':
                     return { type: 'create_task', titleTemplate: action.titleTemplate || 'Tarefa de exemplo', dueDays: action.dueDays || 3 };
                default:
                    return null;
            }
        }).filter((a: AutomationAction | null): a is AutomationAction => a !== null);


        const newCampaign: Omit<Automation, 'id'|'accountId'|'enabled'> = {
            name: resultJson.name,
            triggerType: 'client_moved_to_list', 
            triggerFilters: {},
            conditions: [],
            actions: cleanedActions,
        };
        
        return newCampaign;

    } catch (e) {
      console.error("Error generating drip campaign with AI:", e);
      throw e;
    }
  };
  
  const addForm = (form: Omit<Form, 'id' | 'createdAt' | 'accountId'>) => {
    const newForm = {
      ...form,
      id: `form-${Date.now()}`,
      createdAt: new Date().toISOString(),
      accountId: currentAccountId,
    };
    setAllForms(p => [...p, newForm]);
  };
  const updateForm = (updatedForm: Form) => {
    setAllForms(p => p.map(f => f.id === updatedForm.id ? updatedForm : f));
  };
  const deleteForm = (formId: string) => {
    setAllForms(p => p.filter(f => f.id !== formId));
  };
  
  const generateFormSuggestions = async (objective: string): Promise<{ title: string, fieldIds: string[] } | null> => {
    const ai = getAiClient(currentAccountId);
    if (!ai) return null;

    const allPossibleFields = [
      { name: 'Nome', id: 'name' },
      { name: 'Email', id: 'email' },
      ...currentAccountData.customFields.map(f => ({ name: f.name, id: f.id })),
    ];
    
    const availableFields = allPossibleFields.map(f => `- ${f.name} (id: ${f.id})`).join('\n');

    const prompt = `Baseado no seguinte objetivo para um formulário de captura de leads, sugira um título otimizado e uma lista dos IDs dos campos mais relevantes para incluir.
    Objetivo: "${objective}"
    
    Campos disponíveis (use os IDs exatos na sua resposta):
    ${availableFields}

    Retorne apenas os IDs dos campos. A resposta deve ser um JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Um título otimizado para o formulário." },
            fieldIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Uma lista dos IDs dos campos mais relevantes." }
        },
        required: ["title", "fieldIds"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Error generating form suggestions:", e);
        return null;
    }
  };


  const renderView = () => {
    // This function will only be called when currentUser is not null
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
                  currentUser={currentUser!}
                  currentAccountId={currentAccountId}
                  accounts={accounts}
                  allClients={allClients}
                  allSubscriptions={allSubscriptions}
                  allServices={allServices}
                  allOneOffJobs={allOneOffJobs}
                  analyzeClientPortfolio={analyzeClientPortfolio}
                  {...currentAccountData}
                />;
      case 'kanban':
        return <KanbanBoard clients={currentAccountData.clients} lists={currentAccountData.lists} updateClientList={updateClientList} />;
      case 'clients':
        return <ClientManager
                  clients={currentAccountData.clients}
                  lists={currentAccountData.lists}
                  customFields={currentAccountData.customFields}
                  subscriptions={currentAccountData.subscriptions}
                  addClient={addClient}
                  updateClient={updateClient}
                  deleteClient={deleteClient}
                />;
      case 'services':
        return <ServiceManager
                  services={currentAccountData.services}
                  addService={addService}
                  updateService={updateService}
                  deleteService={deleteService}
                />;
      case 'subscriptions':
        return <SubscriptionManager
                  subscriptions={currentAccountData.subscriptions}
                  clients={currentAccountData.clients}
                  services={currentAccountData.services}
                  addSubscription={addSubscription}
                  updateSubscription={updateSubscription}
                  deleteSubscription={deleteSubscription}
                />;
      case 'oneOffJobs':
        return <OneOffJobManager
                  oneOffJobs={currentAccountData.oneOffJobs}
                  clients={currentAccountData.clients}
                  addOneOffJob={addOneOffJob}
                  updateOneOffJob={updateOneOffJob}
                  deleteOneOffJob={deleteOneOffJob}
                />;
      case 'automations':
        return <AutomationsManager
                  automations={currentAccountData.automations}
                  lists={currentAccountData.lists}
                  customFields={currentAccountData.customFields}
                  addAutomation={addAutomation}
                  updateAutomation={updateAutomation}
                  deleteAutomation={deleteAutomation}
                  isAiAvailable={isAiAvailable}
                  generateWhatsAppTemplate={generateWhatsAppTemplate}
                  generateDripCampaign={generateDripCampaign}
                />;
      case 'tasks':
        return <TaskManager 
                    tasks={currentAccountData.tasks} 
                    clients={currentAccountData.clients} 
                    updateTask={updateTask} 
                    addTask={addTask}
                    deleteTask={deleteTask}
                />;
      case 'marketingTools':
        return <MarketingTools
                  clients={currentAccountData.clients}
                  swotAnalyses={currentAccountData.swotAnalyses}
                  clientQuestionnaires={currentAccountData.clientQuestionnaires}
                  bcgAnalyses={currentAccountData.bcgAnalyses}
                  gmbProfiles={currentAccountData.gmbProfiles}
                  personas={currentAccountData.personas}
                  saveSwotAnalysis={saveSwotAnalysis}
                  saveClientQuestionnaire={saveClientQuestionnaire}
                  saveBcgAnalysis={saveBcgAnalysis}
                  saveGmbProfile={saveGmbProfile}
                  savePersonaAnalysis={savePersonaAnalysis}
                  deletePersonaAnalysis={deletePersonaAnalysis}
                  generateQuestionnaire={generateQuestionnaire}
                  analyzeAndCreateSwot={analyzeAndCreateSwot}
                  estimateBcgMetrics={estimateBcgMetrics}
                  generatePersonas={generatePersonas}
                  optimizeGmbDescription={optimizeGmbDescription}
                  generateGmbPostIdeas={generateGmbPostIdeas}
                  suggestGmbServices={suggestGmbServices}
                  generateGmbReviewResponse={generateGmbReviewResponse}
                  isAiAvailable={isAiAvailable}
                />;
       case 'conversations':
        return <Conversations 
                  clients={currentAccountData.clients}
                  messages={currentAccountData.clientMessages}
                  addClientMessage={addClientMessage}
                  analyzeClientMessage={analyzeClientMessage}
                  isAiAvailable={isAiAvailable}
               />;
      case 'forms':
        return <FormManager 
                 forms={currentAccountData.forms}
                 customFields={currentAccountData.customFields}
                 lists={currentAccountData.lists}
                 addForm={addForm}
                 updateForm={updateForm}
                 deleteForm={deleteForm}
                 isAiAvailable={isAiAvailable}
                 generateFormSuggestions={generateFormSuggestions}
               />;
      case 'webview':
        return <WebviewArea webViews={currentAccountData.webViews} />;
      case 'calendar':
        return <CalendarView events={calendarEvents} isLoading={isCalendarLoading} error={calendarError} calendarUrl={calendarUrl} />;
      case 'settings':
        return <Settings 
                    currentUser={currentUser!}
                    accounts={accounts}
                    users={users}
                    currentAccount={currentAccountData.account}
                    addUserAndAccount={addUserAndAccount}
                    updateUserAccess={updateUserAccess}
                    resetUserPassword={resetUserPassword}
                    deleteUserAndAccount={deleteUserAndAccount}
                    generateClientReport={generateClientReport}
                    customFields={currentAccountData.customFields} 
                    lists={currentAccountData.lists} 
                    webViews={currentAccountData.webViews} 
                    calendarUrl={calendarUrl} 
                    addCustomField={addCustomField} 
                    deleteCustomField={(id) => setAllCustomFields(p => p.filter(f => f.id !== id))} 
                    addList={addList} 
                    updateList={updateList} 
                    deleteList={deleteList} 
                    addWebView={(v) => setAllWebViews(p => [...p, { ...v, id: `wv-${Date.now()}`, accountId: currentAccountId }])} 
                    deleteWebView={(id) => setAllWebViews(p => p.filter(v => v.id !== id))} 
                    saveCalendarUrl={saveCalendarUrl} 
                    saveAccountApiKey={saveAccountApiKey}
                    saveWhatsAppConfig={saveWhatsAppConfig}
                />;
      default:
        return <div>Not Found or view not implemented in this snippet.</div>;
    }
  };

  if (formId) {
    const form = allForms.find(f => f.id === formId);
    if (form) {
      return <PublicForm form={form} />;
    }
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        currentUser={currentUser} 
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentUser={currentUser}
          accounts={accounts}
          currentAccountId={currentAccountId}
          setCurrentAccountId={setCurrentAccountId}
          title={viewTitles[currentView]} 
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;