export type RubricQuestion = {
  id: string
  label: string
  description: string
  maxScore: number
  answerType?: 'score' | 'boolean'
  booleanScoring?: 'normal' | 'inverted'
}

export type RubricSection = {
  id: string
  title: string
  summary: string
  questions: RubricQuestion[]
}

export const rubricVersion = '巡店评分表-v4'

export const rubricSections: RubricSection[] = [
  {
    id: 'dishes',
    title: '菜品',
    summary: '重点检查口味、出品、温度、分量、稳定性和顾客感知。',
    questions: [
      {
        id: 'dish_taste',
        label: '口味稳定',
        description: '核心菜品口味是否稳定，是否符合门店标准。',
        maxScore: 10,
      },
      {
        id: 'dish_plating',
        label: '出品呈现',
        description: '摆盘、颜色、完整度和上桌观感是否到位。',
        maxScore: 10,
      },
      {
        id: 'dish_temperature',
        label: '温度控制',
        description: '热菜、冷菜、饮品是否处于合适温度。',
        maxScore: 10,
      },
      {
        id: 'dish_portion',
        label: '分量与性价比',
        description: '分量是否稳定，顾客是否容易感知价值。',
        maxScore: 10,
      },
      {
        id: 'dish_consistency',
        label: '出品一致性',
        description: '同一菜品不同批次的口味、外观、份量是否一致。',
        maxScore: 10,
      },
      {
        id: 'dish_freshness',
        label: '新鲜度',
        description: '食材新鲜、状态良好，没有明显久放痕迹。',
        maxScore: 10,
      },
      {
        id: 'dish_customer_feedback',
        label: '顾客反馈',
        description: '顾客对菜品的反映是否正面，是否存在集中投诉点。',
        maxScore: 10,
      },
    ],
  },
  {
    id: 'service',
    title: '服务',
    summary: '检查接待、响应、解释和收尾体验。',
    questions: [
      {
        id: 'service_greeting',
        label: '接待主动性',
        description: '员工是否能主动、礼貌、及时地接待顾客。',
        maxScore: 5,
      },
      {
        id: 'service_response',
        label: '响应与解释',
        description: '对顾客提问、加菜、催单、特殊需求的响应是否清楚。',
        maxScore: 5,
      },
    ],
  },
  {
    id: 'hygiene',
    title: '卫生',
    summary: '检查前厅、桌面、洗手间、工具和整体整洁度。',
    questions: [
      {
        id: 'hygiene_front',
        label: '前厅与桌面卫生',
        description: '地面、桌面、台面、公共区域是否干净整洁。',
        maxScore: 5,
      },
      {
        id: 'hygiene_tools',
        label: '工具与设备卫生',
        description: '餐具、夹具、设备表面和接触面是否及时清洁。',
        maxScore: 5,
      },
    ],
  },
  {
    id: 'kitchen',
    title: '厨房操作',
    summary: '检查食材安全、采购规范、预制和过期管理。',
    questions: [
      {
        id: 'kitchen_pre_fried_chicken',
        label: '14:00后仍预制炸鸡？',
        description: '14:00后是否仍有提前预制炸鸡，是否存在影响新鲜度的做法。',
        maxScore: 4,
        answerType: 'boolean',
      },
      {
        id: 'kitchen_expired_materials',
        label: '是否有过期原料？',
        description: '仓储、冷藏和操作台是否存在过期、临期未处理的原料。',
        maxScore: 3,
        answerType: 'boolean',
      },
      {
        id: 'kitchen_designated_purchase',
        label: '是否指定处采购？',
        description: '原料是否按照指定采购渠道、指定供应商或指定门店流程采购。',
        maxScore: 3,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
    ],
  },
]