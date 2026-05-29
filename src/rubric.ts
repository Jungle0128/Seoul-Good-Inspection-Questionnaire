export type RubricQuestion = {
  id: string
  label: string
  description?: string
  maxScore: number
  answerType?: 'score' | 'boolean' | 'checkboxes'
  booleanScoring?: 'normal' | 'inverted'
  checkboxOptions?: string[]
}

export type RubricSection = {
  id: string
  title: string
  summary?: string
  questions: RubricQuestion[]
}

export const rubricVersion = '巡店评分表-v6'

const hotDishCheckboxOptions = ['美观新鲜度', '出餐量', '按标准搭配']

export const rubricSections: RubricSection[] = [
  {
    id: 'overall',
    title: '餐食总项',
    questions: [
      {
        id: 'overall_impression',
        label: '整体餐台效果',
        maxScore: 10,
        answerType: 'score'
      }
    ]
  },
  {
    id: 'hot_dishes',
    title: '热餐',
    summary: '出餐标准得3分，出餐美观得2分，出餐合格得1分，不合格得0分（共 45 分）',
    questions: [
      {
        id: 'hot_1',
        label: '辣蛋黄鸡腿肉',
        description: '鸡块呈浅金黄色，奶酱匀匀覆盖；鸡块分明，外观完整',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_2',
        label: '是拉差奶油鸡排',
        description: '颜色均匀金黄，酱汁颜色有层次；外观完整不脱皮；鸡肉多汁有咬感',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_3',
        label: '黑椒柠檬鸡腿',
        description: '鸡块呈浅金黄色，奶酱均匀覆盖；鸡块分明，外壳完整',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_4',
        label: '水牛城辣翅',
        description: '鸡翅鸡翅呈棕金色，表面酱汁浓郁发亮；鸡翅外皮完整有虎皮纹路',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_5',
        label: '原味脆皮鸡翅',
        description: '金黄色，表面干爽，麟片状炸皮明显；外皮完整，不脱皮，入口酥脆，鸡肉多汁',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_6',
        label: '左宗棠鸡',
        description: '鸡块红亮油润，无酱汁沉底；鸡块不粘黏，酱汁包裹均匀；外脆里酥不油腻',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_7',
        label: '日式酱油鸡翅',
        description: '鸡翅呈深棕琥珀色，表面油亮发光；鸡翅外皮完整有虎皮纹路',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_8',
        label: '薯网',
        description: '颜色金黄，不粘黏',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_9',
        label: '饺子和炸虾',
        description: '配比均匀，颜色合格',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_10',
        label: '辣炒牛肉',
        description: '颜色合格，牛肉和配菜配比合理，菜品新鲜',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_11',
        label: '叉烧',
        description: '颜色红棕偏琥珀色，表面有均匀亮油，边缘有轻微焦化；肉块大小均匀（2-3cm）；盘底酱汁少、不积水；肉有弹性不柴',
        maxScore: 1,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_12',
        label: '腰果鸡',
        description: '鸡肉呈浅棕油亮色；鸡肉占主体，腰果均匀分布，蔬菜作为辅助层次；酱汁薄薄包裹，不积汁',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_13',
        label: '炒蔬菜',
        description: '蔬菜颜色明亮新鲜；形状完整，大小均匀；脆爽感明显，清爽不油腻',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_14',
        label: '炒饭',
        description: '米饭呈均匀棕色，有自然油亮感，米粒分明，鸡蛋均匀分布，配菜比例均衡，炒饭有蓬松感，香菜鲜绿',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_15',
        label: '炒粉',
        description: '米粉呈深棕琥珀色，表面油亮但不积油，米粉根根分明，配菜颜色丰富鲜亮，鸡蛋均匀分布，芝麻均匀撒落，香菜立体蓬松',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
      {
        id: 'hot_16',
        label: ' ',
        description: '以每月新品小组内的讨论为标准',
        maxScore: 3,
        answerType: 'checkboxes',
        checkboxOptions: hotDishCheckboxOptions,
      },
    ],
  },
  {
    id: 'salads',
    title: '沙拉',
    summary: '沙拉类共 10 分（多项各 1 分）',
    questions: [
      {
        id: 'salad_1',
        label: '黄瓜沙拉',
        description: '黄瓜和胡萝卜新鲜不得干瘪，黄瓜切片厚度均匀约0.5cm',
        maxScore: 1,
      },
      {
        id: 'salad_2',
        label: '新鲜水果',
        description: '新鲜水果蔬菜不得干瘪，软烂；颜色需保持新鲜；沙拉用料搭配合理',
        maxScore: 1,
      },
      {
        id: 'salad_3',
        label: '白萝卜',
        description: '汤汁沥干，颜色明亮',
        maxScore: 1
      },
      {
        id: 'salad_4',
        label: '鸡肉沙拉',
        description: '蔬菜新鲜不得干瘪，软烂；沙拉用料搭配合理；酱汁均匀',
        maxScore: 1
      },
      {
        id: 'salad_5',
        label: '羽衣甘蓝沙拉',
        description: '蔬菜新鲜不得干瘪，软烂；沙拉用料搭配合理；酱汁均匀',
        maxScore: 1
      },
      {
        id: 'salad_6',
        label: '泡菜',
        description: '汤汁沥干，颜色鲜艳',
        maxScore: 1
      },
      {
        id: 'salad_7',
        label: '紫甘蓝',
        description: '汤汁沥干，颜色鲜艳，不干',
        maxScore: 1
      },
      {
        id: 'salad_8',
        label: '苹果酸奶沙拉',
        description: '新鲜水果不得干瘪，软烂；酸奶适量包裹；葡萄干点缀',
        maxScore: 1
      },
      {
        id: 'salad_9',
        label: '新鲜沙拉',
        description: '蔬菜新鲜不得干瘪，软烂；沙拉用料搭配合理',
        maxScore: 1
      },
      {
        id: 'salad_10',
        label: '蘑菇沙拉',
        description: '蘑菇新鲜；沙拉用料搭配合理；酱汁均匀',
        maxScore: 1
      },
    ],
  },
  {
    id: 'after_meal',
    title: '餐后类',
    summary: '餐后饮品与甜品（共 3 分）',
    questions: [
      {
        id: 'coffee',
        label: '咖啡',
        description: '新鲜，颜色适中，不空壶',
        maxScore: 1
      },
      {
        id: 'tea',
        label: '茶',
        description: '新鲜，颜色适中，不空壶',
        maxScore: 1
      },
      {
        id: 'sweets',
        label: '糖果罐',
        description: '四种以上，摆放整齐，饱满',
        maxScore: 1
      },
    ],
  },
  {
    id: 'front_of_house',
    title: '前厅',
    summary: '自助餐台、客座区、收餐区与吧台区（共 10 分）',
    questions: [
      {
        id: 'buffet_area',
        label: '自助餐台',
        description: '桌面整洁干净，用具、刀叉盘子干净，灯具干净',
        maxScore: 3
      },
      {
        id: 'dining_area',
        label: '客座区',
        description: '地面干净，无明显垃圾，桌椅整齐干净，桌面无油光',
        maxScore: 3
      },
      {
        id: 'collection_area',
        label: '收餐区',
        description: '收餐区域及其地面干净，整洁，无垃圾堆积',
        maxScore: 2
      },
      {
        id: 'bar_area',
        label: '吧台区',
        description: '不推放杂物，物料摆放合理美观',
        maxScore: 2
      },
    ],
  },
  {
    id: 'back_kitchen_storage',
    title: '后厨及仓库',
    summary: '仓库与设备、过期管理与清洁（共 10 分）',
    questions: [
      {
        id: 'ingredients_goods',
        label: '食材与货物',
        description: '不得直接摆放于地面',
        maxScore: 2,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
      {
        id: 'floors_clean',
        label: '地面',
        description: '地面必须保持整洁，不得出现湿滑，油污附着现象',
        maxScore: 2,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
      {
        id: 'expired_management',
        label: '过期管理',
        description: '在保质期内使用食材',
        maxScore: 2,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
      {
        id: 'kitchen_equipment',
        label: '厨房设备',
        description: '后厨设备内外干净整洁，有无定期清洁',
        maxScore: 2,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
      {
        id: 'storage_and_utensils',
        label: '食材保存与器皿使用',
        description: '是否按照要求保存食材，使用器皿及厨房设备',
        maxScore: 2,
        answerType: 'boolean',
        booleanScoring: 'normal',
      },
    ],
  },
  {
    id: 'service',
    title: '服务',
    summary: '服务态度与着装（共 6 分）',
    questions: [
      {
        id: 'queue_and_collection',
        label: '不在吧台聚集，时刻保持巡桌，收餐盘及时',
        description: '不在吧台聚集，时刻保持巡桌，收餐盘及时',
        maxScore: 2,
      },
      { id: 'kassa_use', label: '服务人员 Kassa 使用熟练、语言流利', description: '服务人员使用收银系统熟练，语言表达流利', maxScore: 1 },
      { id: 'dress_code', label: '工作时着工装、仪表整洁', description: '工作时着工装且干净整洁，不戴耳机或玩手机', maxScore: 1 },
      { id: 'service_attitude', label: '服务礼貌、主动介绍与微笑', description: '服务人员态度热情礼貌，面带微笑，进离店打招呼，主动介绍', maxScore: 2 },
    ],
  },
  {
    id: 'other',
    title: '其他与反馈',
    summary: 'Google / Wolt / 指定供货商采购（共 6 分）',
    questions: [
      { id: 'google_rating', label: 'Google map 评分大于等于 4.3 得 1 分', description: 'Google map 评分大于等于 4.3 得 1 分', maxScore: 1 },
      { id: 'wolt_rating', label: 'Wolt 评分大于等于 8.8 得 1 分', description: 'Wolt 评分大于等于 8.8 得 1 分', maxScore: 1 },
      { id: 'procurement_req', label: '按公司要求指定供应商采购', description: '根据公司要求，从指定供货商处采购指定商品', maxScore: 3 },
    ],
  },
]