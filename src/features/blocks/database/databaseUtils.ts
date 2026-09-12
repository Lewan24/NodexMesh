import type { DatabaseField, DatabaseTable, DatabaseRelation } from '@/entities/board/types';

export function createDatabaseField(name = 'id'): DatabaseField {
  return { id: crypto.randomUUID(), name, dataType: 'integer', primaryKey: name === 'id', nullable: false, unique: false, defaultValue: '' };
}
export function createDatabaseTable(name: string, index: number): DatabaseTable {
  return { id: crypto.randomUUID(), name, position: { x: index % 3 * 352, y: Math.floor(index / 3) * 320 }, fields: [createDatabaseField()] };
}
export function validDatabaseRelations(tables: DatabaseTable[], relations: DatabaseRelation[]): DatabaseRelation[] {
  return relations.filter(relation => {
    const source = tables.find(table => table.id === relation.source);
    const target = tables.find(table => table.id === relation.target);
    return source?.fields.some(field => field.id === relation.sourceField) && target?.fields.some(field => field.id === relation.targetField)
      && !(relation.source === relation.target && relation.sourceField === relation.targetField);
  });
}
export function canAddDatabaseRelation(tables: DatabaseTable[], relations: DatabaseRelation[], relation: DatabaseRelation): boolean {
  return validDatabaseRelations(tables, [relation]).length === 1 && !relations.some(existing =>
    existing.source === relation.source && existing.target === relation.target &&
    existing.sourceField === relation.sourceField && existing.targetField === relation.targetField);
}
export function databaseExample() {
  const users = createDatabaseTable('users', 0);
  users.fields.push({ ...createDatabaseField('email'), dataType: 'varchar(255)', unique: true });
  const posts = createDatabaseTable('posts', 1);
  posts.fields.push(createDatabaseField('user_id'), { ...createDatabaseField('title'), dataType: 'varchar(255)' });
  return { tables: [users, posts], relations: [{ id: crypto.randomUUID(), source: posts.id, target: users.id, sourceField: posts.fields[1]!.id, targetField: users.fields[0]!.id, cardinality: 'N:1' as const }] };
}
