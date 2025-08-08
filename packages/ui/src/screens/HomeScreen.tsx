// packages/ui/src/screens/HomeScreen.tsx
import { YStack, H1, Paragraph } from 'tamagui'

export const HomeScreen = () => (
  <YStack f={1} ai="center" jc="center" space>
    <H1>Welcome to Lumera Hub</H1>
    <Paragraph>This screen is shared between Web & Mobile.</Paragraph>
  </YStack>
)

