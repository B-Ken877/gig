// Gig Solutions SRMS — Agent Assessment Question Bank
// Each question is a realistic, job-relevant multiple-choice question.

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  category: string;
}

export interface AssessmentSection {
  id: string;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  isConditional: boolean;
  conditionLanguage: string | null;
}

// ──────────────────────────────────────────────────────────────
// Section 1: English Language Proficiency (10 questions)
// ──────────────────────────────────────────────────────────────
const englishQuestions: AssessmentQuestion[] = [
  {
    id: 'en-1',
    question: 'Choose the correct sentence:',
    options: [
      { label: 'A', text: 'The group of employees is attending the training session.' },
      { label: 'B', text: 'The group of employees are attending the training session.' },
      { label: 'C', text: 'The group of employees has attend the training session.' },
      { label: 'D', text: 'The group of employees attending the training sessions.' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'en-2',
    question: 'Which word correctly completes the sentence? "The customer was upset because the package _______ arrived on time."',
    options: [
      { label: 'A', text: 'didn\'t' },
      { label: 'B', text: 'don\'t' },
      { label: 'C', text: 'doesn\'t' },
      { label: 'D', text: 'haven\'t' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'en-3',
    question: 'What does the term "escalation" mean in a customer service context?',
    options: [
      { label: 'A', text: 'Increasing the price of a product or service' },
      { label: 'B', text: 'Transferring a customer issue to a higher-level representative or manager' },
      { label: 'C', text: 'Closing a support ticket without resolution' },
      { label: 'D', text: 'Following up with a customer after their issue is resolved' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
  {
    id: 'en-4',
    question: 'Identify the error in this sentence: "Each of the representatives need to complete their training by Friday."',
    options: [
      { label: 'A', text: '"Each" should be replaced with "All"' },
      { label: 'B', text: '"need" should be changed to "needs"' },
      { label: 'C', text: '"their" should be changed to "there"' },
      { label: 'D', text: 'There is no error in the sentence' },
    ],
    correctAnswer: 'B',
    category: 'grammar',
  },
  {
    id: 'en-5',
    question: 'Which preposition correctly fills the blank? "Our team is responsible _______ handling all inbound customer inquiries."',
    options: [
      { label: 'A', text: 'for' },
      { label: 'B', text: 'of' },
      { label: 'C', text: 'with' },
      { label: 'D', text: 'about' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'en-6',
    question: 'Read the following passage and answer the question:\n\n"Our company policy states that all refund requests must be submitted within 14 business days of the original purchase. Refunds for digital products are processed within 3-5 business days, while physical items may take up to 10 business days."\n\nAccording to the policy, how long does a refund for a digital product take to process?',
    options: [
      { label: 'A', text: 'Up to 10 business days' },
      { label: 'B', text: 'Within 14 business days' },
      { label: 'C', text: 'Within 3-5 business days' },
      { label: 'D', text: 'The passage does not specify' },
    ],
    correctAnswer: 'C',
    category: 'comprehension',
  },
  {
    id: 'en-7',
    question: 'Choose the sentence with correct subject-verb agreement:',
    options: [
      { label: 'A', text: 'The list of available shifts are posted on the bulletin board.' },
      { label: 'B', text: 'The list of available shifts is posted on the bulletin board.' },
      { label: 'C', text: 'The list of available shifts have been posted on the bulletin board.' },
      { label: 'D', text: 'The list of available shifts were posted on the bulletin board.' },
    ],
    correctAnswer: 'B',
    category: 'grammar',
  },
  {
    id: 'en-8',
    question: 'What does "first call resolution" (FCR) refer to in a call center environment?',
    options: [
      { label: 'A', text: 'Answering a call on the first ring' },
      { label: 'B', text: 'Resolving a customer\'s issue during the initial contact without requiring a callback or transfer' },
      { label: 'C', text: 'Making the first call of your shift' },
      { label: 'D', text: 'Calling a customer back after resolving their issue' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
  {
    id: 'en-9',
    question: 'Which sentence uses the correct tense?',
    options: [
      { label: 'A', text: 'I have worked at this company since three years.' },
      { label: 'B', text: 'I am working at this company for three years.' },
      { label: 'C', text: 'I have been working at this company for three years.' },
      { label: 'D', text: 'I was working at this company since three years.' },
    ],
    correctAnswer: 'C',
    category: 'grammar',
  },
  {
    id: 'en-10',
    question: 'Which word is the best replacement for "accommodate" in this sentence: "We will do our best to _______ the customer\'s special request."',
    options: [
      { label: 'A', text: 'Ignore' },
      { label: 'B', text: 'Fulfill' },
      { label: 'C', text: 'Reject' },
      { label: 'D', text: 'Postpone' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 2: Spanish Language Proficiency (10 questions)
// ──────────────────────────────────────────────────────────────
const spanishQuestions: AssessmentQuestion[] = [
  {
    id: 'es-1',
    question: '¿Cuál es la forma correcta? "Yo _______ de México." (ser vs. estar)',
    options: [
      { label: 'A', text: 'estoy' },
      { label: 'B', text: 'soy' },
      { label: 'C', text: 'es' },
      { label: 'D', text: 'hablo' },
    ],
    correctAnswer: 'B',
    category: 'grammar',
  },
  {
    id: 'es-2',
    question: 'How do you say "Good morning, how can I help you today?" in Spanish?',
    options: [
      { label: 'A', text: 'Buenos días, ¿qué necesitas hoy?' },
      { label: 'B', text: 'Buenas noches, ¿cómo puedo ayudarte?' },
      { label: 'C', text: 'Buenos días, ¿en qué le puedo ayudar hoy?' },
      { label: 'D', text: 'Buenas tardes, ¿qué quieres?' },
    ],
    correctAnswer: 'C',
    category: 'customer-service',
  },
  {
    id: 'es-3',
    question: 'What is the correct conjugation of "tener" (to have) for "ellos" (they)?',
    options: [
      { label: 'A', text: 'tengo' },
      { label: 'B', text: 'tienes' },
      { label: 'C', text: 'tiene' },
      { label: 'D', text: 'tienen' },
    ],
    correctAnswer: 'D',
    category: 'grammar',
  },
  {
    id: 'es-4',
    question: '¿Cómo se dice "I will transfer you to the correct department" en español?',
    options: [
      { label: 'A', text: 'Yo le transfiero al departamento correcto.' },
      { label: 'B', text: 'Yo le voy a transferir al departamento correcto.' },
      { label: 'C', text: 'Yo transfiero usted al departamento correcto.' },
      { label: 'D', text: 'Yo mandar usted al departamento correcto.' },
    ],
    correctAnswer: 'B',
    category: 'customer-service',
  },
  {
    id: 'es-5',
    question: 'Choose the correct sentence:',
    options: [
      { label: 'A', text: 'Los clientes están esperando por una respuesta.' },
      { label: 'B', text: 'Los clientes son esperando por una respuesta.' },
      { label: 'C', text: 'Los clientes has esperando por una respuesta.' },
      { label: 'D', text: 'Los clientes está esperando por una respuesta.' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'es-6',
    question: 'What does "disculpe las molestias" mean in English?',
    options: [
      { label: 'A', text: 'Excuse me, where is the bathroom?' },
      { label: 'B', text: 'I apologize for the inconvenience' },
      { label: 'C', text: 'Please wait a moment' },
      { label: 'D', text: 'Can you repeat that?' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
  {
    id: 'es-7',
    question: 'Which phrase would you use to place a customer on hold in Spanish?',
    options: [
      { label: 'A', text: 'Por favor espere un momento, le pongo en espera.' },
      { label: 'B', text: 'Cuelgue el teléfono por favor.' },
      { label: 'C', text: 'No puedo ayudarle hoy.' },
      { label: 'D', text: 'Vuelva a llamar más tarde.' },
    ],
    correctAnswer: 'A',
    category: 'customer-service',
  },
  {
    id: 'es-8',
    question: 'Choose the correct word: "Necesito _______ una copia del recibo."',
    options: [
      { label: 'A', text: 'hacer' },
      { label: 'B', text: 'hago' },
      { label: 'C', text: 'haz' },
      { label: 'D', text: 'haciendo' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'es-9',
    question: 'What does the Spanish phrase "¿Puedo verificar su información?" mean?',
    options: [
      { label: 'A', text: 'Can I cancel your order?' },
      { label: 'B', text: 'Can I verify your information?' },
      { label: 'C', text: 'Can I refund your payment?' },
      { label: 'D', text: 'Can I change your address?' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
  {
    id: 'es-10',
    question: 'Which is the correct formal way to say "Thank you for calling" in Spanish?',
    options: [
      { label: 'A', text: 'Gracias por llamar, señor.' },
      { label: 'B', text: 'Gracias por llamar, amiga.' },
      { label: 'C', text: 'Le agradecemos por haber llamado.' },
      { label: 'D', text: 'Te agradezco por llamar.' },
    ],
    correctAnswer: 'C',
    category: 'customer-service',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 3: French Language Proficiency (10 questions)
// ──────────────────────────────────────────────────────────────
const frenchQuestions: AssessmentQuestion[] = [
  {
    id: 'fr-1',
    question: 'Quelle est la forme correcte? "Je _______ un agent de service client." (être)',
    options: [
      { label: 'A', text: 'es' },
      { label: 'B', text: 'suis' },
      { label: 'C', text: 'est' },
      { label: 'D', text: 'sommes' },
    ],
    correctAnswer: 'B',
    category: 'grammar',
  },
  {
    id: 'fr-2',
    question: 'How do you say "Hello, how may I assist you today?" in French?',
    options: [
      { label: 'A', text: 'Bonjour, que puis-je faire pour vous aujourd\'hui?' },
      { label: 'B', text: 'Salut, tu veux quoi?' },
      { label: 'C', text: 'Bonsoir, comment allez-vous?' },
      { label: 'D', text: 'Bonjour, merci de votre appel.' },
    ],
    correctAnswer: 'A',
    category: 'customer-service',
  },
  {
    id: 'fr-3',
    question: 'What is the correct conjugation of "avoir" (to have) for "ils/elles"?',
    options: [
      { label: 'A', text: 'ont' },
      { label: 'B', text: 'avez' },
      { label: 'C', text: 'as' },
      { label: 'D', text: 'ai' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'fr-4',
    question: 'How do you say "I apologize for the inconvenience" in French?',
    options: [
      { label: 'A', text: 'Merci pour votre patience.' },
      { label: 'B', text: 'Je vous remercie de votre appel.' },
      { label: 'C', text: 'Je m\'excuse pour les désagréments.' },
      { label: 'D', text: 'Veuillez rappeler plus tard.' },
    ],
    correctAnswer: 'C',
    category: 'customer-service',
  },
  {
    id: 'fr-5',
    question: 'Choose the correct article: "_______ client est en attente depuis dix minutes."',
    options: [
      { label: 'A', text: 'Un' },
      { label: 'B', text: 'Le' },
      { label: 'C', text: 'Les' },
      { label: 'D', text: 'Des' },
    ],
    correctAnswer: 'B',
    category: 'grammar',
  },
  {
    id: 'fr-6',
    question: 'What does "Veuillez patienter un instant" mean?',
    options: [
      { label: 'A', text: 'Please hang up' },
      { label: 'B', text: 'Please hold for a moment' },
      { label: 'C', text: 'Please call back later' },
      { label: 'D', text: 'Thank you for waiting' },
    ],
    correctAnswer: 'B',
    category: 'vocabulary',
  },
  {
    id: 'fr-7',
    question: 'How do you ask a customer for their account number in French?',
    options: [
      { label: 'A', text: 'Donnez-moi votre numéro.' },
      { label: 'B', text: 'Quel est votre numéro de compte, s\'il vous plaît?' },
      { label: 'C', text: 'Où est votre compte?' },
      { label: 'D', text: 'Combien coûte votre compte?' },
    ],
    correctAnswer: 'B',
    category: 'customer-service',
  },
  {
    id: 'fr-8',
    question: 'Choose the correct sentence:',
    options: [
      { label: 'A', text: 'Nous allons résoudre votre problème.' },
      { label: 'B', text: 'Nous résoudrons votre problème hier.' },
      { label: 'C', text: 'Nous résolvons votre problème demain.' },
      { label: 'D', text: 'Nous résoudre votre problème maintenant.' },
    ],
    correctAnswer: 'A',
    category: 'grammar',
  },
  {
    id: 'fr-9',
    question: 'What does "remboursement" mean in English?',
    options: [
      { label: 'A', text: 'Replacement' },
      { label: 'B', text: 'Cancellation' },
      { label: 'C', text: 'Refund' },
      { label: 'D', text: 'Reservation' },
    ],
    correctAnswer: 'C',
    category: 'vocabulary',
  },
  {
    id: 'fr-10',
    question: 'Which phrase would you use to end a professional call in French?',
    options: [
      { label: 'A', text: 'C\'est fini, au revoir.' },
      { label: 'B', text: 'Merci d\'avoir appelé. Bonne journée!' },
      { label: 'C', text: 'Dépêchez-vous de raccrocher.' },
      { label: 'D', text: 'Je dois partir maintenant.' },
    ],
    correctAnswer: 'B',
    category: 'customer-service',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 4: Customer Service Skills (10 questions)
// ──────────────────────────────────────────────────────────────
const customerServiceQuestions: AssessmentQuestion[] = [
  {
    id: 'cs-1',
    question: 'A customer calls in extremely frustrated because their order has not arrived after two weeks. What is the BEST first response?',
    options: [
      { label: 'A', text: 'Tell the customer that shipping delays are common and they should be patient.' },
      { label: 'B', text: 'Acknowledge their frustration, apologize sincerely, and immediately look into their order status.' },
      { label: 'C', text: 'Transfer them to the shipping department without explanation.' },
      { label: 'D', text: 'Explain that it is not your department and give them another number to call.' },
    ],
    correctAnswer: 'B',
    category: 'de-escalation',
  },
  {
    id: 'cs-2',
    question: 'Which of the following is the most effective de-escalation technique?',
    options: [
      { label: 'A', text: 'Speaking more loudly to be heard over the angry customer' },
      { label: 'B', text: 'Matching the customer\'s emotional intensity to show you understand' },
      { label: 'C', text: 'Using a calm, steady tone of voice and empathetic language while letting the customer vent' },
      { label: 'D', text: 'Immediately offering a discount to end the call quickly' },
    ],
    correctAnswer: 'C',
    category: 'de-escalation',
  },
  {
    id: 'cs-3',
    question: 'A customer reports receiving a defective product. What is the best approach for service recovery?',
    options: [
      { label: 'A', text: 'Ask the customer to return the product at their own expense before offering any help.' },
      { label: 'B', text: 'Apologize, arrange a replacement or refund at no cost to the customer, and follow up to ensure satisfaction.' },
      { label: 'C', text: 'Blame the shipping company for the damage and tell the customer to contact them.' },
      { label: 'D', text: 'Offer a partial refund only if the customer agrees not to leave a negative review.' },
    ],
    correctAnswer: 'B',
    category: 'service-recovery',
  },
  {
    id: 'cs-4',
    question: 'What does empathy mean in a customer service context?',
    options: [
      { label: 'A', text: 'Feeling sorry for the customer' },
      { label: 'B', text: 'Agreeing with everything the customer says' },
      { label: 'C', text: 'Understanding and sharing the customer\'s feelings while maintaining professionalism to resolve their issue' },
      { label: 'D', text: 'Crying with the customer when they are upset' },
    ],
    correctAnswer: 'C',
    category: 'empathy',
  },
  {
    id: 'cs-5',
    question: 'A customer asks a question that you do not know the answer to. What should you do?',
    options: [
      { label: 'A', text: 'Guess the answer based on your best judgment.' },
      { label: 'B', text: 'Tell the customer you don\'t know and hang up.' },
      { label: 'C', text: 'Put the customer on hold, research the correct answer or ask a supervisor, and then provide accurate information.' },
      { label: 'D', text: 'Give them the wrong information and hope they don\'t notice.' },
    ],
    correctAnswer: 'C',
    category: 'professionalism',
  },
  {
    id: 'cs-6',
    question: 'Which of the following best describes "going above and beyond" for a customer?',
    options: [
      { label: 'A', text: 'Doing the minimum required by company policy' },
      { label: 'B', text: 'Taking additional steps to surprise and delight the customer, exceeding their expectations' },
      { label: 'C', text: 'Only helping customers who are polite and friendly' },
      { label: 'D', text: 'Spending more time than necessary on every call' },
    ],
    correctAnswer: 'B',
    category: 'professionalism',
  },
  {
    id: 'cs-7',
    question: 'A customer is being verbally abusive on the phone. What is the appropriate response?',
    options: [
      { label: 'A', text: 'Yell back at the customer to establish authority.' },
      { label: 'B', text: 'Remain calm, set a boundary by politely asking the customer to refrain from using abusive language, and warn that the call may need to be ended if the behavior continues.' },
      { label: 'C', text: 'Hang up immediately without warning.' },
      { label: 'D', text: 'Transfer the call to a coworker.' },
    ],
    correctAnswer: 'B',
    category: 'de-escalation',
  },
  {
    id: 'cs-8',
    question: 'What is the primary goal of first call resolution (FCR)?',
    options: [
      { label: 'A', text: 'To end the call as quickly as possible regardless of outcome' },
      { label: 'B', text: 'To resolve the customer\'s issue completely during the first interaction, improving customer satisfaction and reducing operational costs' },
      { label: 'C', text: 'To transfer the customer to the right department on the first attempt' },
      { label: 'D', text: 'To log the call in the system before disconnecting' },
    ],
    correctAnswer: 'B',
    category: 'metrics',
  },
  {
    id: 'cs-9',
    question: 'When providing information to a customer, which approach is MOST effective?',
    options: [
      { label: 'A', text: 'Use technical jargon to demonstrate expertise.' },
      { label: 'B', text: 'Speak as quickly as possible to be efficient.' },
      { label: 'C', text: 'Use clear, simple language and confirm that the customer understands the information provided.' },
      { label: 'D', text: 'Provide only the minimum information needed.' },
    ],
    correctAnswer: 'C',
    category: 'communication',
  },
  {
    id: 'cs-10',
    question: 'A loyal customer of 5 years is considering leaving due to a recent negative experience. What is the best retention strategy?',
    options: [
      { label: 'A', text: 'Tell them it\'s their choice to leave and there\'s nothing you can do.' },
      { label: 'B', text: 'Acknowledge their loyalty, sincerely apologize for the recent experience, take ownership of the issue, and offer a meaningful resolution.' },
      { label: 'C', text: 'Offer a generic discount code without addressing the specific issue.' },
      { label: 'D', text: 'Explain that all companies have occasional problems.' },
    ],
    correctAnswer: 'B',
    category: 'service-recovery',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 5: Communication & Active Listening (8 questions)
// ──────────────────────────────────────────────────────────────
const communicationQuestions: AssessmentQuestion[] = [
  {
    id: 'com-1',
    question: 'Which of the following is an example of active listening?',
    options: [
      { label: 'A', text: 'Thinking about what you will say next while the customer is speaking' },
      { label: 'B', text: 'Multitasking on your computer while the customer talks' },
      { label: 'C', text: 'Fully concentrating on what the customer is saying, paraphrasing their concern, and asking clarifying questions' },
      { label: 'D', text: 'Interrupting the customer to show you understand their issue' },
    ],
    correctAnswer: 'C',
    category: 'active-listening',
  },
  {
    id: 'com-2',
    question: 'A customer says: "I\'ve been trying to fix this for three days and nobody seems to care!" What is the best clarifying response?',
    options: [
      { label: 'A', text: '"Calm down, we\'ll figure it out."' },
      { label: 'B', text: '"I understand this has been frustrating for you. Can you tell me exactly what issue you\'ve been experiencing so I can help resolve it today?"' },
      { label: 'C', text: '"That\'s not true. We help all our customers."' },
      { label: 'D', text: '"I\'ll transfer you to someone who can help."' },
    ],
    correctAnswer: 'B',
    category: 'clarifying',
  },
  {
    id: 'com-3',
    question: 'Which non-verbal communication element is MOST important during a phone conversation?',
    options: [
      { label: 'A', text: 'Eye contact' },
      { label: 'B', text: 'Body posture and gestures' },
      { label: 'C', text: 'Tone of voice and pacing' },
      { label: 'D', text: 'Facial expressions' },
    ],
    correctAnswer: 'C',
    category: 'non-verbal',
  },
  {
    id: 'com-4',
    question: 'When speaking with a customer who has a strong accent that is difficult to understand, what should you do?',
    options: [
      { label: 'A', text: 'Pretend to understand and guess what they mean.' },
      { label: 'B', text: 'Politely ask them to repeat or rephrase, and confirm your understanding by summarizing what you heard.' },
      { label: 'C', text: 'Ask to speak to someone else at their location.' },
      { label: 'D', text: 'Speak more loudly so they can hear you better.' },
    ],
    correctAnswer: 'B',
    category: 'clarifying',
  },
  {
    id: 'com-5',
    question: 'What is the purpose of paraphrasing in a customer service conversation?',
    options: [
      { label: 'A', text: 'To waste time and increase call duration' },
      { label: 'B', text: 'To show the customer you are listening and to confirm you accurately understand their concern before proceeding' },
      { label: 'C', text: 'To repeat the customer\'s complaint back to them' },
      { label: 'D', text: 'To change the subject away from the problem' },
    ],
    correctAnswer: 'B',
    category: 'active-listening',
  },
  {
    id: 'com-6',
    question: 'Which of the following demonstrates positive language in customer service?',
    options: [
      { label: 'A', text: '"I can\'t do that."' },
      { label: 'B', text: '"That\'s not my department."' },
      { label: 'C', text: '"What I can do for you is..." or "Let me find a solution for you."' },
      { label: 'D', text: '"You should have called earlier."' },
    ],
    correctAnswer: 'C',
    category: 'tone-language',
  },
  {
    id: 'com-7',
    question: 'A customer gives a long explanation of their problem with multiple details. What is the best approach?',
    options: [
      { label: 'A', text: 'Interrupt them to save time and get to the solution.' },
      { label: 'B', text: 'Let them finish, take notes on key details, and then summarize your understanding before offering a solution.' },
      { label: 'C', text: 'Ask them to send an email instead because it takes too long on the phone.' },
      { label: 'D', text: 'Only focus on the first thing they mentioned.' },
    ],
    correctAnswer: 'B',
    category: 'active-listening',
  },
  {
    id: 'com-8',
    question: 'When delivering bad news to a customer (such as a policy limitation), what is the best approach?',
    options: [
      { label: 'A', text: 'Blame the company policy and say your hands are tied.' },
      { label: 'B', text: 'Be honest but empathetic, explain the situation clearly, and offer alternative solutions if available.' },
      { label: 'C', text: 'Lie to the customer to avoid disappointing them.' },
      { label: 'D', text: 'Transfer them to a manager to avoid the uncomfortable conversation.' },
    ],
    correctAnswer: 'B',
    category: 'tone-language',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 6: Problem Solving & Conflict Resolution (8 questions)
// ──────────────────────────────────────────────────────────────
const problemSolvingQuestions: AssessmentQuestion[] = [
  {
    id: 'ps-1',
    question: 'You have three customers on hold: one has been waiting 10 minutes with a billing question, one has been waiting 3 minutes with a technical emergency, and one has been waiting 7 minutes to place a new order. Who should you help first?',
    options: [
      { label: 'A', text: 'The customer who has been waiting the longest (10 minutes)' },
      { label: 'B', text: 'The customer with the technical emergency, as it is the most urgent issue' },
      { label: 'C', text: 'The customer waiting to place a new order (revenue-generating)' },
      { label: 'D', text: 'Help them in the order they called in' },
    ],
    correctAnswer: 'B',
    category: 'prioritization',
  },
  {
    id: 'ps-2',
    question: 'A customer demands to speak with a manager immediately, but the issue is something you are fully authorized and trained to resolve. What should you do?',
    options: [
      { label: 'A', text: 'Escalate to a manager immediately to avoid conflict.' },
      { label: 'B', text: 'Confidently explain that you have the expertise to resolve the issue, attempt to solve it, and only escalate if the customer insists after your attempt.' },
      { label: 'C', text: 'Refuse to transfer and insist the customer deal with you.' },
      { label: 'D', text: 'Put the customer on hold indefinitely.' },
    ],
    correctAnswer: 'B',
    category: 'escalation',
  },
  {
    id: 'ps-3',
    question: 'When should you escalate a customer issue to a supervisor?',
    options: [
      { label: 'A', text: 'Whenever the customer asks, regardless of the situation' },
      { label: 'B', text: 'Only when you have exhausted all available options, the issue exceeds your authority, or the customer explicitly requests escalation after you have attempted resolution' },
      { label: 'C', text: 'At the end of every call as a standard procedure' },
      { label: 'D', text: 'When you simply don\'t feel like handling the call' },
    ],
    correctAnswer: 'B',
    category: 'escalation',
  },
  {
    id: 'ps-4',
    question: 'Two customers have conflicting requests that cannot both be fulfilled. How should you handle the situation?',
    options: [
      { label: 'A', text: 'Fulfill the request of the louder, more demanding customer.' },
      { label: 'B', text: 'Apply company policies fairly, explain the situation to each customer individually, and find the best possible compromise.' },
      { label: 'C', text: 'Fulfill both requests even if it violates company policy.' },
      { label: 'D', text: 'Choose randomly.' },
    ],
    correctAnswer: 'B',
    category: 'conflict-resolution',
  },
  {
    id: 'ps-5',
    question: 'A customer\'s complaint reveals a recurring issue affecting multiple customers. What is the most appropriate action?',
    options: [
      { label: 'A', text: 'Resolve the individual customer\'s issue but say nothing about the pattern.' },
      { label: 'B', text: 'Resolve the customer\'s issue, document the pattern in your system, and report it to your supervisor so the root cause can be addressed.' },
      { label: 'C', text: 'Tell the customer that everyone is having the same problem.' },
      { label: 'D', text: 'Post about it on social media.' },
    ],
    correctAnswer: 'B',
    category: 'problem-solving',
  },
  {
    id: 'ps-6',
    question: 'A customer wants a solution that violates company policy. What is the best approach?',
    options: [
      { label: 'A', text: 'Make an exception this one time without telling anyone.' },
      { label: 'B', text: 'Clearly explain the policy, express understanding of their frustration, and offer the closest alternative that is within policy.' },
      { label: 'C', text: 'Simply say "no" and end the conversation.' },
      { label: 'D', text: 'Lie and say the policy will change soon.' },
    ],
    correctAnswer: 'B',
    category: 'conflict-resolution',
  },
  {
    id: 'ps-7',
    question: 'A system outage is preventing you from accessing customer records. Customers are calling in about the same issue. What should you do?',
    options: [
      { label: 'A', text: 'Tell each caller individually that the system is down and hang up.' },
      { label: 'B', text: 'Acknowledge the issue, document each customer\'s concern for follow-up, provide an estimated resolution time if available, and assure customers they will be contacted once the issue is resolved.' },
      { label: 'C', text: 'Stop answering calls until the system is back.' },
      { label: 'D', text: 'Pretend the system is working and make up answers.' },
    ],
    correctAnswer: 'B',
    category: 'problem-solving',
  },
  {
    id: 'ps-8',
    question: 'Which approach best demonstrates creative problem-solving in customer service?',
    options: [
      { label: 'A', text: 'Always following the script word-for-word, regardless of the situation' },
      { label: 'B', text: 'Thinking outside standard procedures to find unique solutions within policy boundaries that address the customer\'s specific needs' },
      { label: 'C', text: 'Telling the customer there is only one solution available' },
      { label: 'D', text: 'Asking the customer what they think the solution should be' },
    ],
    correctAnswer: 'B',
    category: 'problem-solving',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 7: Basic Computer Skills (8 questions)
// ──────────────────────────────────────────────────────────────
const computerSkillsQuestions: AssessmentQuestion[] = [
  {
    id: 'comp-1',
    question: 'Which keyboard shortcut is used to copy selected text in most applications?',
    options: [
      { label: 'A', text: 'Ctrl + V' },
      { label: 'B', text: 'Ctrl + C' },
      { label: 'C', text: 'Ctrl + P' },
      { label: 'D', text: 'Ctrl + S' },
    ],
    correctAnswer: 'B',
    category: 'shortcuts',
  },
  {
    id: 'comp-2',
    question: 'What is the recommended professional email subject line for contacting a customer about their order?',
    options: [
      { label: 'A', text: '"Important"' },
      { label: 'B', text: '"Read this now"' },
      { label: 'C', text: '"Update regarding your order #12345 — Gig Solutions"' },
      { label: 'D', text: '"Hi"' },
    ],
    correctAnswer: 'C',
    category: 'email-etiquette',
  },
  {
    id: 'comp-3',
    question: 'Which of the following is the BEST practice for professional email communication?',
    options: [
      { label: 'A', text: 'Using ALL CAPS to emphasize important points' },
      { label: 'B', text: 'Writing in a casual, informal tone with lots of emojis' },
      { label: 'C', text: 'Using a clear subject line, professional greeting, concise body, and a proper signature' },
      { label: 'D', text: 'Sending multiple short emails instead of one complete message' },
    ],
    correctAnswer: 'C',
    category: 'email-etiquette',
  },
  {
    id: 'comp-4',
    question: 'In a spreadsheet application (like Excel or Google Sheets), what does the SUM function do?',
    options: [
      { label: 'A', text: 'Finds the average of a range of cells' },
      { label: 'B', text: 'Adds together all the numbers in a selected range of cells' },
      { label: 'C', text: 'Counts the number of cells with data' },
      { label: 'D', text: 'Sorts the data alphabetically' },
    ],
    correctAnswer: 'B',
    category: 'office-apps',
  },
  {
    id: 'comp-5',
    question: 'What is a CRM system used for in a call center environment?',
    options: [
      { label: 'A', text: 'Only for sending marketing emails' },
      { label: 'B', text: 'Managing customer interactions, storing customer data, tracking service history, and supporting relationship management' },
      { label: 'C', text: 'Managing employee payroll' },
      { label: 'D', text: 'Designing company logos' },
    ],
    correctAnswer: 'B',
    category: 'systems',
  },
  {
    id: 'comp-6',
    question: 'What is the standard typing speed target for a call center agent handling chat-based customer support?',
    options: [
      { label: 'A', text: '20-30 words per minute' },
      { label: 'B', text: '40-60 words per minute' },
      { label: 'C', text: '100+ words per minute' },
      { label: 'D', text: 'Typing speed is not important for chat support' },
    ],
    correctAnswer: 'B',
    category: 'typing',
  },
  {
    id: 'comp-7',
    question: 'Which file format is commonly used for documents that need to be shared and viewed consistently across different devices and operating systems?',
    options: [
      { label: 'A', text: '.docx' },
      { label: 'B', text: '.txt' },
      { label: 'C', text: '.pdf' },
      { label: 'D', text: '.csv' },
    ],
    correctAnswer: 'C',
    category: 'file-management',
  },
  {
    id: 'comp-8',
    question: 'When managing multiple browser tabs during a customer call, what is the best practice?',
    options: [
      { label: 'A', text: 'Keep as many tabs open as possible for quick access.' },
      { label: 'B', text: 'Close all tabs except the ones needed for the current task to reduce distractions and improve performance.' },
      { label: 'C', text: 'Never use browser tabs; open new windows instead.' },
      { label: 'D', text: 'Use only one tab at a time, closing it before opening the next.' },
    ],
    correctAnswer: 'B',
    category: 'browser-navigation',
  },
];

// ──────────────────────────────────────────────────────────────
// Section 8: Call Center Operations (6 questions)
// ──────────────────────────────────────────────────────────────
const callCenterQuestions: AssessmentQuestion[] = [
  {
    id: 'cc-1',
    question: 'What does AHT (Average Handle Time) measure?',
    options: [
      { label: 'A', text: 'The total number of calls an agent handles in a day' },
      { label: 'B', text: 'The average duration of a customer interaction, including talk time, hold time, and after-call work' },
      { label: 'C', text: 'The time a customer spends on hold' },
      { label: 'D', text: 'The number of agents needed per shift' },
    ],
    correctAnswer: 'B',
    category: 'metrics',
  },
  {
    id: 'cc-2',
    question: 'What does CSAT stand for and what does it measure?',
    options: [
      { label: 'A', text: 'Customer Service Activity Tracking — measures agent productivity' },
      { label: 'B', text: 'Customer Satisfaction — measures how satisfied customers are with the service they received' },
      { label: 'C', text: 'Call System Administration Tool — manages call routing' },
      { label: 'D', text: 'Customer Support Automation Technology — automates responses' },
    ],
    correctAnswer: 'B',
    category: 'metrics',
  },
  {
    id: 'cc-3',
    question: 'What is the purpose of a call script?',
    options: [
      { label: 'A', text: 'To force agents to read every word without any personalization' },
      { label: 'B', text: 'To provide a structured framework for calls, ensuring consistency, compliance, and that all required information is collected' },
      { label: 'C', text: 'To replace the need for agent training' },
      { label: 'D', text: 'To record calls for legal purposes' },
    ],
    correctAnswer: 'B',
    category: 'call-scripting',
  },
  {
    id: 'cc-4',
    question: 'What is quality assurance (QA) in a call center?',
    options: [
      { label: 'A', text: 'A process for firing underperforming agents' },
      { label: 'B', text: 'Monitoring and evaluating customer interactions to ensure compliance with standards, identify training needs, and improve service quality' },
      { label: 'C', text: 'A type of software used to route calls' },
      { label: 'D', text: 'A customer feedback survey' },
    ],
    correctAnswer: 'B',
    category: 'quality-assurance',
  },
  {
    id: 'cc-5',
    question: 'What is the main purpose of a ticketing system in a support environment?',
    options: [
      { label: 'A', text: 'To bill customers for support calls' },
      { label: 'B', text: 'To track, manage, and document customer issues from creation through resolution, ensuring accountability and follow-up' },
      { label: 'C', text: 'To schedule agent shifts' },
      { label: 'D', text: 'To play hold music for customers' },
    ],
    correctAnswer: 'B',
    category: 'ticketing',
  },
  {
    id: 'cc-6',
    question: 'What does NPS (Net Promoter Score) measure?',
    options: [
      { label: 'A', text: 'The number of new prospects a company has' },
      { label: 'B', text: 'Customer loyalty and likelihood to recommend the company to others, based on the question "How likely are you to recommend us?"' },
      { label: 'C', text: 'The number of calls handled per shift' },
      { label: 'D', text: 'The percentage of new hires who pass training' },
    ],
    correctAnswer: 'B',
    category: 'metrics',
  },
];

// ──────────────────────────────────────────────────────────────
// All sections combined
// ──────────────────────────────────────────────────────────────
export const assessmentSections: AssessmentSection[] = [
  {
    id: 'english',
    title: 'English Language Proficiency',
    description: 'Grammar, vocabulary, and reading comprehension',
    questions: englishQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
  {
    id: 'spanish',
    title: 'Spanish Language Proficiency',
    description: 'Grammar, vocabulary, and customer service phrases in Spanish',
    questions: spanishQuestions,
    isConditional: true,
    conditionLanguage: 'Spanish',
  },
  {
    id: 'french',
    title: 'French Language Proficiency',
    description: 'Grammar, vocabulary, and customer service phrases in French',
    questions: frenchQuestions,
    isConditional: true,
    conditionLanguage: 'French',
  },
  {
    id: 'customer-service',
    title: 'Customer Service Skills',
    description: 'Handling customers, de-escalation, service recovery, and professionalism',
    questions: customerServiceQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
  {
    id: 'communication',
    title: 'Communication & Active Listening',
    description: 'Active listening techniques, clarifying, and verbal communication',
    questions: communicationQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
  {
    id: 'problem-solving',
    title: 'Problem Solving & Conflict Resolution',
    description: 'Handling complaints, prioritization, and escalation procedures',
    questions: problemSolvingQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
  {
    id: 'computer-skills',
    title: 'Basic Computer Skills',
    description: 'Office applications, email etiquette, and browser navigation',
    questions: computerSkillsQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
  {
    id: 'call-center',
    title: 'Call Center Operations',
    description: 'Metrics, CRM usage, call scripting, and quality assurance',
    questions: callCenterQuestions,
    isConditional: false,
    conditionLanguage: null,
  },
];

// Helper alias for convenience
export function getAssessmentSections(): AssessmentSection[] {
  return assessmentSections;
}

// Helper: get sections filtered by agent languages
export function getFilteredSections(languages: string[]): AssessmentSection[] {
  return assessmentSections.filter((section) => {
    if (!section.isConditional) return true;
    return languages.some(
      (lang) => lang.toLowerCase() === section.conditionLanguage?.toLowerCase()
    );
  });
}

// Helper: calculate total questions for a set of sections
export function getTotalQuestions(sections: AssessmentSection[]): number {
  return sections.reduce((sum, s) => sum + s.questions.length, 0);
}
