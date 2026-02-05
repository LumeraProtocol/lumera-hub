import { Card, Input, Button } from 'tamagui';
import { Search, CircleCheck, CircleMinus, Trash2, FilePenLine } from 'lucide-react';
import dayjs from 'dayjs';
import ReactPaginate from 'react-paginate';

import { AppLoading } from '@/components/Loading';
import { IUser } from '@/hooks/admin/useUser';

interface IUserScreen {
  isLoading: boolean;
  users: IUser[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  keyword: string;
  handlePageClick: ({ selected }: { selected: number }) => void;
  handleSearchChange: (val: string) => void;
}

export const UserScreen = ({
  isLoading,
  users,
  currentPage,
  totalPages,
  keyword,
  pageSize,
  handlePageClick,
  handleSearchChange,
}: IUserScreen) => {
  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <div className='flex justify-between w-full'>
            <div className='btn-primary'>
              <Button className='!py-1'>
                Add new user
              </Button>
            </div>
            <div className="relative w-full sm:w-auto">
              <div className='input-wrapper'>
                <Input
                  id="keyword"
                  placeholder="Keywords..."
                  className='input !pr-[50px] min-w-40'
                  value={keyword}
                  onChangeText={handleSearchChange}
                />
                <span className='input-symbol'>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </span>
              </div>
            </div>
          </div>
        </Card.Header>
        <div className='p-5'>
          {isLoading ?
          <div className='min-h-[200px] relative'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
          </div> :
          <table className='w-full border-separate border-spacing-y-2'>
            <thead className='hidden md:table-header-group text-gray-400 text-sm'>
              <tr>
                <th align='left' className='px-2 py-3'>No.</th>
                <th align='left' className='px-2 py-3'>Full Name</th>
                <th align='left' className='px-2 py-3'>Email</th>
                <th align='left' className='px-2 py-3'>Status</th>
                <th align='left' className='px-2 py-3'>Created At</th>
                <th align='left' className='px-2 py-3'>Updated At</th>
                <th align='left' className='px-2 py-3 w-12'></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={user.id}>
                  <td className='px-2 py-3'>
                    {(currentPage - 1) * pageSize + (index + 1)}
                  </td>
                  <td className='px-2 py-3'>
                    {user.fullName}
                  </td>
                  <td className='px-2 py-3'>
                    {user.email}
                  </td>
                  <td className='px-2 py-3'>
                    {user.isActive ?
                      <CircleCheck className='w-6 h-6 text-lumera-teal' /> :
                      <CircleMinus className='w-6 h-6 text-lumera-red-light' />
                    }
                  </td>
                  <td className='px-2 py-3'>
                    {dayjs(user.createdAt).format('HH:mm MM/DD/YYYY')}
                  </td>
                  <td className='px-2 py-3'>
                    {dayjs(user.updatedAt).format('HH:mm MM/DD/YYYY')}
                  </td>
                  <td className='px-2 py-3'>
                    <div className="flex gap-2">
                      <Button circular>
                        <FilePenLine className="w-5 h-5" />
                      </Button>
                      <Button circular>
                        <Trash2 className="w-5 h-5 text-lumera-red-light" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ?
                <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                  <td className='px-2 py-3' colSpan={7}>
                    <div className='w-full text-xl'>No data</div>
                  </td>
                </tr> : null
              }
            </tbody>
          </table>
          }
          {totalPages > 1 ?
            <div className="paginate-wrapper pt-3">
              <ReactPaginate
                breakLabel="..."
                nextLabel=">"
                onPageChange={handlePageClick}
                pageRangeDisplayed={3}
                pageCount={totalPages}
                previousLabel="<"
                renderOnZeroPageCount={null}
                className='react-paginate'
              />
            </div> : null
          }
        </div>
      </Card>
    </div>
  )
}
