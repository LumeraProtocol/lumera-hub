import { Card } from 'tamagui';

import AppButton from '@/components/AppButton';

interface IDashboardScreen {
  isLoading: boolean;
  isRemove: boolean;
  canRemove: boolean;
  onRedirect: (url: string) => void;
  onDownloadDb: () => void;
  onRemoveDb: () => void;
}

export const DashboardScreen = ({
  isLoading,
  isRemove,
  canRemove = false,
  onRedirect,
  onDownloadDb,
  onRemoveDb,
}: IDashboardScreen) => {

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-5'>
          <div className='flex items-center gap-3'>
            <AppButton onClick={onDownloadDb} disabled={isLoading} className='disabled:opacity-40'>
              Download db file
            </AppButton>
            {canRemove ?
              <AppButton onClick={onRemoveDb} disabled={isRemove} variant='third' className='disabled:opacity-40'>
                Clear db file
              </AppButton> : null
            }
            <AppButton onClick={() => onRedirect('/admin/tracking')}>
              Tracking
            </AppButton>
            <AppButton onClick={() => onRedirect('/admin/campaigns/sprints/season-2')}>
              Campaigns
            </AppButton>
            <AppButton onClick={() => onRedirect('/admin/campaigns/sprints/season-2/create')}>
              Create Loyalty Rule
            </AppButton>
          </div>
        </div>
      </Card>
    </div>
  )
}
