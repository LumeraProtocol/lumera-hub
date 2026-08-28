import {
  Card,
} from 'tamagui';

export const NotFoundScreen = ({
  content,
}: {
  content: string;
}) => {
  if (!content) {
    return null;
  }
  return (
    <div className='h-full w-full flex items-center justify-center'>
      <Card elevate size="$4" bordered className='w-full relative'>
        <div className='text-red-500 w-full p-5 min-h-40 flex items-center'>
          <span>{content}</span>
        </div>
      </Card>
    </div>
  );
}
