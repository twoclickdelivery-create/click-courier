import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color: string;
  focused?: boolean;
}

export const OrdersIcon: React.FC<IconProps> = ({ size = 22, color, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="4"
      y="6"
      width="16"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
      fill={focused ? color : 'none'}
      fillOpacity={focused ? 0.15 : 0}
    />
    <Path
      d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
    />
    <Path
      d="M9 12h6M9 16h4"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
      strokeLinecap="round"
    />
  </Svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ size = 22, color, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
      fill={focused ? color : 'none'}
      fillOpacity={focused ? 0.15 : 0}
    />
    <Path
      d="M12 7v5l3 2"
      stroke={color}
      strokeWidth={focused ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ size = 22, color, focused }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="8"
      r="4"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
      fill={focused ? color : 'none'}
      fillOpacity={focused ? 0.15 : 0}
    />
    <Path
      d="M4 21c0-4 3.5-7 8-7s8 3 8 7"
      stroke={color}
      strokeWidth={focused ? 2 : 1.6}
      strokeLinecap="round"
    />
  </Svg>
);
