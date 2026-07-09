import type { Category, Question } from './questionSchema';

export const categoryLabel: Record<Category, string> = {
  vocabulary: '词汇题库',
  human_resources_review: '人力资源复习',
  news_english: '新闻英语',
  into_the_wild: '荒野生存',
  other: '其他',
};

export function availableCategories(questions: Question[]): Category[] {
  const order: Category[] = ['vocabulary', 'human_resources_review', 'news_english', 'into_the_wild', 'other'];
  const present = new Set(questions.map((question) => question.category));
  return order.filter((category) => present.has(category));
}
