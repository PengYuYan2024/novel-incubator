import type { RelationType } from "./types";

const relationLabels: Record<RelationType, readonly [string, string]> = {
  related: ["相关", "相关"],
  appears_in: ["出场于", "包含出场"],
  influences: ["影响", "受影响于"],
  conflicts_with: ["冲突", "冲突"],
  belongs_to: ["隶属于", "包含"],
  generated_by: ["由此产生", "产生了"],
};

const symmetricRelations = new Set<RelationType>([
  "related",
  "conflicts_with",
]);

export function relationLabelForViewer(
  relationType: RelationType,
  viewerSide: "source" | "target",
): string {
  return relationLabels[relationType][viewerSide === "source" ? 0 : 1];
}

export function isSymmetricRelation(relationType: RelationType): boolean {
  return symmetricRelations.has(relationType);
}

export function canonicalRelationEndpoints(
  relationType: RelationType,
  sourceItemId: string,
  targetItemId: string,
): readonly [string, string] {
  if (!isSymmetricRelation(relationType) || sourceItemId <= targetItemId) {
    return [sourceItemId, targetItemId];
  }
  return [targetItemId, sourceItemId];
}
