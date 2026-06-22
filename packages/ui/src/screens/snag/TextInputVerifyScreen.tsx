import {
  Card,
  TextArea,
} from 'tamagui';
import dayjs from 'dayjs';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import Recaptcha from '@/components/Recaptcha';
import { IQuest, IResponse } from '@/hooks/useSnagTextInput';
import { IReviewResponse } from '@/hooks/useSnagReview';

interface ITextInputVerifyScreen {
  isLoading: boolean;
  content: string;
  message: {
    type: string;
    content: string;
  };
  quest: IQuest | null;
  response: IResponse | null;
  isVerified: boolean;
  review: {
    isLoading: boolean;
    responses: IReviewResponse[],
  };
  onVerifyClick: () => void;
  onChangeText: (val: string) => void;
  oneRecaptchaChange: (value: string | null) => void;
}

export const TextInputVerifyScreen = ({
  isLoading,
  content,
  message,
  quest,
  response,
  isVerified,
  review,
  onVerifyClick,
  onChangeText,
  oneRecaptchaChange,
}: ITextInputVerifyScreen) => {
  const config = quest?.config ? JSON.parse(quest?.config) : null;

  const getStatusColor = (status: string) => {
    if (status === 'reject') {
      return 'text-lumera-red';
    }
    if (status === 'approved') {
      return 'text-lumera-teal';
    }
    return '';
  }

  return (
    <div className='h-full w-full'>
      <Card elevate size="$4" bordered className='w-full relative'>
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
                <div className="mt-3">
                  <Recaptcha onChange={oneRecaptchaChange} />
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
                    disabled={!content || isLoading || !isVerified}
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
      </Card>
      {config && Number(config.textInput.maximumRewardClaims) > 1 ?
        <Card elevate size="$4" bordered className='w-full relative mt-8'>
          {review.isLoading ?
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
                History
              </SectionTitle>
              <div className="mt-3">
                <table className='w-full border-separate border-spacing-y-2 text-sm'>
                  <thead className='hidden md:table-header-group text-gray-400'>
                    <tr>
                      <th align='left' className='px-2 py-3'>#</th>
                      <th align='left' className='px-2 py-3'>Submitted</th>
                      <th align='left' className='px-2 py-3'>Status</th>
                      <th align='left' className='px-2 py-3'>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.isLoading ?
                      <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                        <td className='px-2 py-3' colSpan={7}>
                          <div className='relative min-h-80'>
                            <AppLoading
                              isLoading
                              className="w-10 h-10 !border-2"
                              iconWidth={20}
                              iconHeight={20}
                              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                            />
                          </div>
                        </td>
                      </tr> :
                      <>
                        {review.responses?.length ?
                          <>
                            {review.responses.map((response, index) => (
                              <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={response.id}>
                                <td className='px-2 py-3'>
                                  {index + 1}
                                </td>
                                <td className='px-2 py-3'>
                                  {response.content}
                                </td>
                                <td className={`px-2 py-3 capitalize ${getStatusColor(response.status)}`}>
                                  {response.status}
                                </td>
                                <td className='px-2 py-3'>
                                  {dayjs(response.created_at).format('MMM DD, YYYY HH:mm')}
                                </td>
                              </tr>
                            ))}
                          </> : <>
                            <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                              <td className='px-2 py-3' colSpan={7}>
                                <div className='w-full text-xl'>No data</div>
                              </td>
                            </tr>
                          </>
                        }

                      </>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </Card> : null
      }
    </div>
  );
}
