import {
  Card,
  TextArea,
  Label,
} from 'tamagui';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { IQuest, IResponse } from '@/hooks/useSnagTextInput';

interface ITextInputVerifyScreen {
  isLoading: boolean;
  content: string;
  message: {
    type: string;
    content: string;
  };
  quest: IQuest | null;
  response: IResponse | null;
  onVerifyClick: () => void;
  onChangeText: (val: string) => void;
}

export const TextInputVerifyScreen = ({
  isLoading,
  content,
  message,
  quest,
  response,
  onVerifyClick,
  onChangeText,
}: ITextInputVerifyScreen) => {
  return (
    <div className='h-full w-full flex items-center justify-center'>
      <Card elevate size="$4" bordered className='w-full relative'>
        {message?.type === 'not-found' ?
          <div className='text-red-500 w-full p-5 min-h-40 flex items-center'>
            <span>{message.content}</span>
          </div> :
          <>
            {isLoading ?
              <div className="flex items-center justify-center min-h-40 w-full">
                <AppLoading
                  isLoading
                  className="w-10 h-10 !border-2"
                  iconWidth={20}
                  iconHeight={20}
                  containerClassName='relative w-10 h-10 z-50'
                />
              </div> :
              <div className='p-5'>
                <SectionTitle className='mb-2'>
                  {quest?.name}
                </SectionTitle>
                <div className='text-lumera-label'>{quest?.description}</div>
                {response?.status !== 'approved' ?
                  <>
                    {response?.status === 'reject' ?
                      <>
                        <div className="mt-5 text-lumera-label text-sm">Status:</div>
                        <div className='mt-1 text-lumera-red'><span className='capitalize'>Reject</span></div>
                      </> : null
                    }

                    <div className="mt-3 text-lumera-label text-sm">Submit to claim rewards:</div>
                    <div className='input-wrapper mt-1'>
                      <TextArea
                        id="content"
                        placeholder="Enter some text here..."
                        className='input'
                        value={content}
                        onChangeText={onChangeText}
                      />
                    </div>
                    {message.type === 'error' ?
                      <div className='text-red-500 w-full mt-3'>
                        <span>{message.content}</span>
                      </div> : null
                    }
                    {message.type === 'success' ?
                      <div className='text-lumera-teal w-full mt-3'>
                        <span>{message.content}</span>
                      </div> : null
                    }
                    <div className='mt-3 flex justify-end'>
                      <AppButton
                        className='disabled:opacity-45'
                        disabled={!content || isLoading}
                        onClick={onVerifyClick}
                      >
                        <span>Submit</span>
                      </AppButton>
                    </div>
                  </> :
                  <>
                    <div className="mt-5 text-lumera-label text-sm">Status:</div>
                    <div className='mt-1 text-lumera-teal'><span className='capitalize'>{response?.status}</span></div>
                    <div className="mt-3 text-lumera-label text-sm">Submit to claim rewards:</div>
                    <div className='mt-1'>
                      {response?.content}
                    </div>
                  </>
                }
              </div>
            }
          </>
        }

      </Card>
    </div>
  );
}
