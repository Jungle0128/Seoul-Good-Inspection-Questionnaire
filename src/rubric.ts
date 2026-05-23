export type RubricQuestion = {
  id: string
  label: string
  description: string
  maxScore: number
}

export type RubricSection = {
  id: string
  title: string
  summary: string
  questions: RubricQuestion[]
}

export const rubricVersion = 'shop-inspection-v1'

export const rubricSections: RubricSection[] = [
  {
    id: 'front-of-house',
    title: 'Front of House',
    summary: 'The first impression, entry area, and customer-facing presentation.',
    questions: [
      {
        id: 'front_cleanliness',
        label: 'Entrance and exterior cleanliness',
        description: 'Glass, doors, sidewalks, and visible fixtures are clean and cared for.',
        maxScore: 5,
      },
      {
        id: 'front_signage',
        label: 'Signage and promotions are clear',
        description: 'Store branding and active promotions are visible, current, and easy to read.',
        maxScore: 5,
      },
      {
        id: 'front_presentation',
        label: 'Front area presentation',
        description: 'The entry zone feels organized, welcoming, and ready for customers.',
        maxScore: 5,
      },
    ],
  },
  {
    id: 'sales-floor',
    title: 'Sales Floor',
    summary: 'Merchandising, pricing, stock discipline, and planogram execution.',
    questions: [
      {
        id: 'floor_merchandising',
        label: 'Merchandising standards',
        description: 'Displays are neat, product is facings-forward, and the layout feels intentional.',
        maxScore: 5,
      },
      {
        id: 'floor_pricing',
        label: 'Pricing and labels are accurate',
        description: 'Price tags, shelf labels, and displayed offers match the current promotion rules.',
        maxScore: 5,
      },
      {
        id: 'floor_stock',
        label: 'Shelf stock availability',
        description: 'Core items are available, replenished, and not blocked by empty spaces.',
        maxScore: 5,
      },
      {
        id: 'floor_compliance',
        label: 'Compliance on the floor',
        description: 'Hazards, blocked aisles, and safety issues are addressed promptly.',
        maxScore: 5,
      },
    ],
  },
  {
    id: 'service',
    title: 'Service and Checkout',
    summary: 'The guest experience from greeting to the payment counter.',
    questions: [
      {
        id: 'service_greeting',
        label: 'Greeting and engagement',
        description: 'The team acknowledges visitors quickly and offers help in a natural way.',
        maxScore: 5,
      },
      {
        id: 'service_product_knowledge',
        label: 'Product knowledge',
        description: 'Staff can explain key products, promos, and service options without hesitation.',
        maxScore: 5,
      },
      {
        id: 'service_checkout',
        label: 'Checkout flow',
        description: 'The queue, payment steps, and closing interaction are smooth and orderly.',
        maxScore: 5,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    summary: 'Back-of-house readiness, execution discipline, and follow-through.',
    questions: [
      {
        id: 'ops_housekeeping',
        label: 'Housekeeping and backroom order',
        description: 'Storage areas are tidy, accessible, and free from obvious clutter.',
        maxScore: 5,
      },
      {
        id: 'ops_followup',
        label: 'Follow-up actions are tracked',
        description: 'Issues from previous visits have clear owners and visible progress.',
        maxScore: 5,
      },
      {
        id: 'ops_overall',
        label: 'Overall execution quality',
        description: 'The store feels consistent, disciplined, and ready for the next audit.',
        maxScore: 5,
      },
    ],
  },
]