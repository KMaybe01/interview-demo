import type { ComponentType } from 'react';
import type { FieldComponentProps, FieldType } from './types.ts';

type FieldRegistry = Map<FieldType, ComponentType<FieldComponentProps>>;

let registry: FieldRegistry = new Map();

export function registerField(
  type: FieldType,
  component: ComponentType<FieldComponentProps>,
): void {
  registry.set(type, component);
}

export function getField(type: FieldType): ComponentType<FieldComponentProps> | undefined {
  return registry.get(type);
}

export function hasField(type: FieldType): boolean {
  return registry.has(type);
}

export function getRegisteredTypes(): FieldType[] {
  return Array.from(registry.keys());
}

export function clearRegistry(): void {
  registry = new Map();
}
