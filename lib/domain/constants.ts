export const CONTENT_STATUSES = [
  "inbox",
  "seed",
  "growing",
  "ready",
  "archived",
] as const;

export const CONTENT_STATUS_META = {
  inbox: { label: "收集箱", description: "刚记录，尚未整理" },
  seed: { label: "种子", description: "方向初步明确" },
  growing: { label: "生长中", description: "正在补充和验证" },
  ready: { label: "可采用", description: "已经能进入大纲或正文" },
  archived: { label: "已归档", description: "暂时不用，但继续保留" },
} as const;

export const PROJECT_STATUSES = [
  "warming",
  "forming",
  "writing",
  "revising",
  "paused",
  "completed",
  "archived",
] as const;

export const PROJECT_STATUS_LABELS = {
  warming: "预热积累",
  forming: "构思成形",
  writing: "正在创作",
  revising: "修改打磨",
  paused: "暂停",
  completed: "已完成",
  archived: "已归档",
} as const;

export const ITEM_TYPES = ["inspiration", "character", "world"] as const;

export const ITEM_TYPE_LABELS = {
  inspiration: "灵感记录",
  character: "人物卡",
  world: "世界观设定",
} as const;

export const INSPIRATION_SUBTYPES = [
  "idea",
  "plot",
  "dialogue",
  "scene",
  "question",
] as const;

export const INSPIRATION_SUBTYPE_LABELS = {
  idea: "灵感",
  plot: "情节",
  dialogue: "台词",
  scene: "场景",
  question: "疑问",
} as const;

export const WORLD_SUBTYPES = [
  "location",
  "faction",
  "institution",
  "history",
  "culture",
  "rule",
  "artifact",
] as const;

export const WORLD_SUBTYPE_LABELS = {
  location: "地点",
  faction: "势力",
  institution: "制度",
  history: "历史",
  culture: "文化",
  rule: "规则",
  artifact: "物品",
} as const;

export const RELATION_TYPES = [
  "related",
  "appears_in",
  "influences",
  "conflicts_with",
  "belongs_to",
  "generated_by",
] as const;

export const RELATION_TYPE_LABELS = {
  related: "相关",
  appears_in: "出场于",
  influences: "影响",
  conflicts_with: "冲突",
  belongs_to: "隶属于",
  generated_by: "由此产生",
} as const;
