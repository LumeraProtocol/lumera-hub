import {
  Card,
  Input,
  Dialog,
  VisuallyHidden,
  Label,
  Select,
  RadioGroup,
  XStack,
  Button,
} from 'tamagui';
import {
  Search,
  CircleCheck,
  CircleMinus,
  Trash2,
  FilePenLine,
} from 'lucide-react';
import dayjs from 'dayjs';
import ReactPaginate from 'react-paginate';

import { AppLoading } from '@/components/Loading';
import SectionTitle from '@/components/SectionTitle';
import AppButton from '@/components/AppButton';
import { IUser } from '@/hooks/admin/useUser';
import { USER_RULE, USER_TYPE, USER_STATUS } from '@/contants';
import { TFromMessage } from '@/types';

interface IUserScreen {
  isLoading: boolean;
  users: IUser[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  keyword: string;
  selectedModal: string;
  userForm: {
    id: number | undefined;
    email: string;
    password: string;
    fullName: string;
    walletAddress: string;
    rule: string;
    status: string;
    type: string;
  };
  isUserLoading: boolean;
  messages: TFromMessage | null;
  handleInputChange: (name: string, value: string) => void;
  handlePageClick: ({ selected }: { selected: number }) => void;
  handleSearchChange: (val: string) => void;
  handleOpenAddUserModal: () => void;
  handleCloseAddUserModal: () => void;
  handleAddUser: () => void;
}

interface IAddUserModal {
  isOpen: boolean;
  userForm: {
    id: number | undefined;
    email: string;
    password: string;
    fullName: string;
    walletAddress: string;
    rule: string;
    status: string;
    type: string;
  };
  isUserLoading: boolean;
  messages: TFromMessage | null;
  handleInputChange: (name: string, value: string) => void;
  onCloseModal: () => void;
  handleAddUser: () => void;
}

const AddUserModal = ({
  isOpen,
  userForm,
  isUserLoading,
  messages,
  handleInputChange,
  onCloseModal,
  handleAddUser,
}: IAddUserModal) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCloseModal}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='relative text-center p-5 w-[750px]'>
            <SectionTitle>
              Add new user
            </SectionTitle>
            <div className='relative'>
              <AppLoading
                isLoading={isUserLoading}
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
              <div className='mt-1'>
                <Label htmlFor="fullName" className='text-base'>Full Name</Label>
                <div className='input-wrapper'>
                  <Input
                    id="fullName"
                    placeholder="Full Name"
                    className='input'
                    value={userForm.fullName}
                    onChangeText={(val) => handleInputChange('fullName', val)}
                  />
                </div>
                {messages?.fullName ?
                  <div className="text-red-500 mt-1 text-sm">{messages.fullName}</div> : null
                }
              </div>
              <div className='mt-1'>
                <Label htmlFor="option" className='text-base'>Type</Label>
                <RadioGroup
                  aria-labelledby="Select one item"
                  name="type"
                  id="type"
                  value={userForm.type}
                  onValueChange={(val) => handleInputChange('type', val)}
                >
                  <div className='flex items-center gap-6'>
                    {USER_TYPE?.map((item) => (
                      <div className='flex items-center gap-3' key={item.value}>
                        <RadioGroup.Item value={item.value} id={`userType-${item.value}`} size="$4">
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        <Label size="$4" id={`userType-${item.value}`} className='leading-none'>
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {messages?.type ?
                  <div className="text-red-500 mt-1 text-sm">{messages.type}</div> : null
                }
              </div>
              {userForm.type === USER_TYPE[0].value ?
                <>
                  <div className='mt-1'>
                    <Label htmlFor="email" className='text-base'>Email</Label>
                    <div className='input-wrapper'>
                      <Input
                        id="email"
                        placeholder="Email"
                        className='input'
                        value={userForm.email}
                        onChangeText={(val) => handleInputChange('email', val)}
                      />
                    </div>
                    {messages?.email ?
                      <div className="text-red-500 mt-1 text-sm">{messages.email}</div> : null
                    }
                  </div>
                  <div className='mt-1'>
                    <Label htmlFor="password" className='text-base'>Password</Label>
                    <div className='input-wrapper'>
                      <Input
                        id="password"
                        placeholder="Password"
                        className='input'
                        secureTextEntry
                        value={userForm.password}
                        onChangeText={(val) => handleInputChange('password', val)}
                      />
                    </div>
                    {messages?.password ?
                      <div className="text-red-500 mt-1 text-sm">{messages.password}</div> : null
                    }
                  </div>
                </> :
                <>
                  <div className='mt-1'>
                    <Label htmlFor="password" className='text-base'>Wallet</Label>
                    <div className='input-wrapper'>
                      <Input
                        id="walletAddress"
                        placeholder="Wallet Address"
                        className='input'
                        value={userForm.walletAddress}
                        onChangeText={(val) => handleInputChange('walletAddress', val)}
                      />
                    </div>
                    {messages?.walletAddress ?
                      <div className="text-red-500 mt-1 text-sm">{messages.walletAddress}</div> : null
                    }
                  </div>
                </>
              }
              <div className='mt-1 grid grid-cols-2 gap-8'>
                <div className='w-full'>
                  <Label htmlFor="option" className='text-base'>Rule</Label>
                  <RadioGroup
                    aria-labelledby="Select one item"
                    name="rule"
                    id="rule"
                    value={userForm.rule}
                    onValueChange={(val) => handleInputChange('rule', val)}
                  >
                    <div className='flex items-center gap-6'>
                      {USER_RULE?.map((item) => (
                        <div className='flex items-center gap-3' key={item.value}>
                          <RadioGroup.Item value={item.value} id={`radiogroup-${item.value}`} size="$4">
                            <RadioGroup.Indicator />
                          </RadioGroup.Item>

                          <Label size="$4" id={`radiogroup-${item.value}`} className='leading-none'>
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {messages?.rule ?
                    <div className="text-red-500 mt-1 text-sm">{messages.rule}</div> : null
                  }
                </div>
                <div className='w-full'>
                  <Label htmlFor="option" className='text-base'>Status</Label>
                  <RadioGroup
                    aria-labelledby="Select one item"
                    name="status"
                    id="status"
                    value={userForm.status}
                    onValueChange={(val) => handleInputChange('status', val)}
                  >
                    <div className='flex items-center gap-6'>
                      {USER_STATUS?.map((item) => (
                        <div className='flex items-center gap-3' key={item.value}>
                          <RadioGroup.Item value={item.value} id={`radiogroup-${item.value}`} size="$4">
                            <RadioGroup.Indicator />
                          </RadioGroup.Item>

                          <Label size="$4" id={`radiogroup-${item.value}`} className='leading-none'>
                            {item.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  {messages?.status ?
                    <div className="text-red-500 mt-1 text-sm">{messages.status}</div> : null
                  }
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <AppButton onClick={handleAddUser}>
                  Save
                </AppButton>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export const UserScreen = ({
  isLoading,
  users,
  currentPage,
  totalPages,
  keyword,
  pageSize,
  selectedModal,
  userForm,
  isUserLoading,
  messages,
  handleInputChange,
  handleOpenAddUserModal,
  handleCloseAddUserModal,
  handlePageClick,
  handleSearchChange,
  handleAddUser,
}: IUserScreen) => {
  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <div className='flex justify-between w-full'>
            <div className='btn-primary'>
              <AppButton onClick={handleOpenAddUserModal}>
                Add new user
              </AppButton>
            </div>
            <div className="relative w-full sm:w-auto hidden">
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
                <th align='left' className='px-2 py-3'>Rule</th>
                <th align='left' className='px-2 py-3'>Status</th>
                <th align='left' className='px-2 py-3'>Created At</th>
                <th align='left' className='px-2 py-3'>Updated At</th>
                <th align='left' className='px-2 py-3 w-12 hidden'></th>
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
                  <td className='px-2 py-3 capitalize'>
                    {user.rule}
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
                  <td className='px-2 py-3 hidden'>
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
      <AddUserModal
        isOpen={selectedModal === 'add'}
        userForm={userForm}
        isUserLoading={isUserLoading}
        messages={messages}
        handleInputChange={handleInputChange}
        onCloseModal={handleCloseAddUserModal}
        handleAddUser={handleAddUser}
      />
    </div>
  )
}
