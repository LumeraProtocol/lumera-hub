import { ReactNode } from 'react';
import type { TooltipProps } from 'tamagui';
import { Tooltip } from 'tamagui';

interface IAppTooltip {
  icon: ReactNode,
  content: ReactNode,
}

export default function AppTooltip({
  icon,
  content,
  ...props
}:  TooltipProps & IAppTooltip) {
  return (
    <Tooltip {...props}>
      <Tooltip.Trigger>
        {icon}
      </Tooltip.Trigger>
      <Tooltip.Content
        enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
        exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
        scale={1}
        x={0}
        y={0}
        opacity={1}
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <Tooltip.Arrow />
        <div>
          {content}
        </div>
      </Tooltip.Content>
    </Tooltip>
  )
}
