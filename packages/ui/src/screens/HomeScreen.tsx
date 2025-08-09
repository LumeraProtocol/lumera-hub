import { YStack, H1, Paragraph } from 'tamagui'

export const HomeScreen = () => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
    <H1>Welcome to Lumera Hub</H1>
    <Paragraph>This screen is shared between Web & Mobile.</Paragraph>
  </YStack>
)

