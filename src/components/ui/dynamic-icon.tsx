
'use client';
import { Icon } from '@iconify/react';
import * as LucideIcons from 'lucide-react';
import React from 'react';

interface DynamicIconProps {
  icon: string;
  [key: string]: any;
}

export function DynamicIcon({ icon, ...props }: DynamicIconProps) {
  if (!icon) {
    return <LucideIcons.HelpCircle {...props} />;
  }

  // Check if it's an Iconify icon (contains a colon)
  if (icon.includes(':')) {
    return <Icon icon={icon} {...props} />;
  }

  // Otherwise, assume it's a Lucide icon
  const LucideIcon = (LucideIcons as any)[icon] || LucideIcons.HelpCircle;
  return <LucideIcon {...props} />;
}
