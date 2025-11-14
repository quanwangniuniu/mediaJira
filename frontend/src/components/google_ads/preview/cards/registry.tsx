'use client';

import React, { type ComponentType } from 'react';
import FactoryCard from './factory/FactoryCard';

function FallbackCard(props: any) {
  return <FactoryCard {...props} />;
}

const REGISTRY: Record<string, ComponentType<any>> = {};

export function resolvePlacementComponent(key: string | undefined | null): ComponentType<any> {
  const anyKey = key || '';
  return (REGISTRY as any)[anyKey] || FallbackCard as any;
}

