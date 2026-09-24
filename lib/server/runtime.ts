import { createNovelOperations } from "./operations";
import { createD1NovelRepository } from "./repository";

export function getNovelOperations() {
  return createNovelOperations(createD1NovelRepository());
}
