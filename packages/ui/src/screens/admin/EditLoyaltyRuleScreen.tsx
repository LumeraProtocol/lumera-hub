import {
  XStack,
  Card,
  Input,
  Label,
  Select,
  TextArea,
  Tooltip,
} from 'tamagui';
import {
  ChevronLeft,
  ChevronDown,
  CheckIcon,
  Info,
} from 'lucide-react';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { FullDateTimesPicker } from '@/components/DateTimePicker';
import AppLink from '@/components/AppLink';
import useSnagLoyaltyRule from '@/hooks/admin/useSnagLoyaltyRule';
import {
  CONDITION,
  CONDITION_EXTEND,
  FREQUENCE, LOYALTY_RULE_TYPE,
  NETWORK,
  TRANSACTION_TYPE,
  UPLOAD_CASCADE,
  ACTION_TYPE,
} from '@/contants/snag';

export const EditLoyaltyRuleScreen = () => {
  const {
    isLoading,
    actionType,
    loyaltyRuleForm,
    configForm,
    currencies,
    messages,
    sections,
    isCurrenciesLoading,
    isSectionsLoading,
    handleFormChange,
    handleInputChange,
    updateLoyaltyRule,
    handleActionTypeChange,
  } = useSnagLoyaltyRule();

  const renderUploadCascadeForm = () => {
    if (configForm.uploadedToCascade.type === UPLOAD_CASCADE[0].value) {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Files *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.uploadedToCascade.fileCondition}
                    onValueChange={(value) => handleInputChange('uploadedToCascade', 'fileCondition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.uploadedToCascade?.files || '0'}
                    onChangeText={(newValue) => handleInputChange('uploadedToCascade', 'files', newValue)}
                  />
                  <span className='input-symbol'>
                    files
                  </span>
                </div>
              </div>
              {messages?.uploadedToCascadeFiles ?
                <div className="text-red-500 mt-1 text-sm">{messages.uploadedToCascadeFiles}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Size *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.uploadedToCascade.sizeCondition}
                    onValueChange={(value) => handleInputChange('uploadedToCascade', 'sizeCondition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.uploadedToCascade?.size || '0'}
                    onChangeText={(newValue) => handleInputChange('uploadedToCascade', 'size', newValue)}
                  />
                  <span className='input-symbol'>
                    KB
                  </span>
                </div>
              </div>
              {messages?.uploadedToCascadeSize ?
                <div className="text-red-500 mt-1 text-sm">{messages.uploadedToCascadeSize}</div> : null
              }
            </div>
          </div>
        </>
      );
    }

    if (configForm.uploadedToCascade.type === UPLOAD_CASCADE[1].value) {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>File Types *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.uploadedToCascade.typesCondition}
                    onValueChange={(value) => handleInputChange('uploadedToCascade', 'typesCondition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.uploadedToCascade?.types || '0'}
                    onChangeText={(newValue) => handleInputChange('uploadedToCascade', 'types', newValue)}
                  />
                  <span className='input-symbol'>
                    types
                  </span>
                </div>
              </div>
              {messages?.uploadedToCascadeTypes ?
                <div className="text-red-500 mt-1 text-sm">{messages.uploadedToCascadeTypes}</div> : null
              }
            </div>
          </div>
        </>
      );
    }

    if (configForm.uploadedToCascade.type === UPLOAD_CASCADE[2].value) {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>File size *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.uploadedToCascade.sizeCondition}
                    onValueChange={(value) => handleInputChange('uploadedToCascade', 'sizeCondition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.uploadedToCascade?.size || '0'}
                    onChangeText={(newValue) => handleInputChange('uploadedToCascade', 'size', newValue)}
                  />
                  <span className='input-symbol'>
                    MB
                  </span>
                </div>
              </div>
              {messages?.uploadedToCascadeSize ?
                <div className="text-red-500 mt-1 text-sm">{messages.uploadedToCascadeSize}</div> : null
              }
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className='mt-1'>
          <Label htmlFor="amount" className='text-base'>Sum of stored file sizes *</Label>
          <div className='input-wrapper'>
            <div className="flex justify-between gap-4">
              <div className="w-1/7">
                <Select
                  id="condition"
                  value={configForm.uploadedToCascade.storeCondition}
                  onValueChange={(value) => handleInputChange('uploadedToCascade', 'storeCondition', value)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder="Select a type" />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={200}>
                      <Select.Group>
                        {CONDITION_EXTEND.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.value}
                            value={item.value}
                          >
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon className='w-4 h-4' />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
              </div>
              <div className="w-6/7">
                <Input
                  id="days"
                  placeholder="Transactions"
                  className='input has-symbol'
                  value={configForm?.uploadedToCascade?.store || '0'}
                  onChangeText={(newValue) => handleInputChange('uploadedToCascade', 'store', newValue)}
                />
                <span className='input-symbol'>
                  GB
                </span>
              </div>
            </div>
            {messages?.uploadedToCascadeStore ?
              <div className="text-red-500 mt-1 text-sm">{messages.uploadedToCascadeStore}</div> : null
            }
          </div>
        </div>
      </>
    );
  }

  const renderConfigForm = () => {
    if (actionType === 'staked') {
      return (
        <div>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>Validator Address *</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="Validator Address"
                className='input'
                value={configForm?.staked?.validator || ''}
                onChangeText={(newValue) => handleInputChange('staked', 'validator', newValue)}
              />
              {messages?.stakedValidator ?
                <div className="text-red-500 mt-1 text-sm">{messages.stakedValidator}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Condition *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="amount"
                    placeholder="Amount"
                    className='input has-symbol'
                    value={configForm?.staked?.amount || '0'}
                    onChangeText={(newValue) => handleInputChange('staked', 'amount', newValue)}
                  />
                  <span className='input-symbol'>
                    LUME
                  </span>
                </div>
              </div>
              {messages?.stakedAmount ?
                <div className="text-red-500 mt-1 text-sm">{messages.stakedAmount}</div> : null
              }
            </div>
          </div>
        </div>
      )
    }

    if (actionType === 'connect') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="domain" className='text-base'>Verify URL *</Label>
            <div className='input-wrapper'>
              <Input
                id="domain"
                placeholder="Verify Domain"
                className='input'
                value={configForm.domain}
                onChangeText={(newValue) => handleInputChange('root', 'domain', newValue)}
              />
              {messages?.connectVerifyURL ?
                <div className="text-red-500 mt-1 text-sm">{messages.connectVerifyURL}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'delegate') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>Validator Address *</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="Validator Address"
                className='input'
                value={configForm?.delegate?.validator || ''}
                onChangeText={(newValue) => handleInputChange('delegate', 'validator', newValue)}
              />
              {messages?.delegateValidator ?
                <div className="text-red-500 mt-1 text-sm">{messages.delegateValidator}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'claim') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="validator" className='text-base'>From Address *</Label>
            <div className='input-wrapper'>
              <Input
                id="validator"
                placeholder="From Address"
                className='input'
                value={configForm?.claim?.validator || ''}
                onChangeText={(newValue) => handleInputChange('claim', 'validator', newValue)}
              />
              {messages?.claimValidator ?
                <div className="text-red-500 mt-1 text-sm">{messages.claimValidator}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'balance') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Condition *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="amount"
                    placeholder="Amount"
                    className='input has-symbol'
                    value={configForm?.balance?.amount || '0'}
                    onChangeText={(newValue) => handleInputChange('balance', 'amount', newValue)}
                  />
                  <span className='input-symbol'>
                    LUME
                  </span>
                </div>
              </div>
              {messages?.balanceAmount ?
                <div className="text-red-500 mt-1 text-sm">{messages.balanceAmount}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'supernode') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Condition *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Days"
                    className='input has-symbol'
                    value={configForm?.supernode?.days || '0'}
                    onChangeText={(newValue) => handleInputChange('supernode', 'days', newValue)}
                  />
                  <span className='input-symbol'>
                    days
                  </span>
                </div>
              </div>
              {messages?.supernode ?
                <div className="text-red-500 mt-1 text-sm">{messages.supernode}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Uptime *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.supernode.condition}
                    onValueChange={(value) => handleInputChange('supernode', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Days"
                    className='input has-symbol'
                    value={configForm?.supernode?.uptime || '0'}
                    onChangeText={(newValue) => handleInputChange('supernode', 'uptime', newValue)}
                  />
                  <span className='input-symbol'>
                    %
                  </span>
                </div>
              </div>
              {messages?.uptime ?
                <div className="text-red-500 mt-1 text-sm">{messages.uptime}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'sendTransactions') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="network" className='text-base'>Type *</Label>
            <div className=''>
              <Select
                id="network"
                value={configForm.sendTransactions.type}
                onValueChange={(val) => handleInputChange('sendTransactions', 'type', val)}
              >
                <Select.Trigger width={'100%'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                  <Select.Value placeholder="N/A" />
                </Select.Trigger>
                <Select.Content zIndex={200000}>
                  <Select.Viewport minWidth={200}>
                    <Select.Group>
                      {TRANSACTION_TYPE?.map((item, index) => {
                        return (
                          <Select.Item
                            key={index}
                            index={index}
                            value={item.value}
                          >
                            <Select.ItemText>
                              {item.label}
                            </Select.ItemText>
                          </Select.Item>
                        )
                      })}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
              {messages?.type ?
                <div className="text-red-500 mt-1 text-sm">{messages.type}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Condition *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.sendTransactions?.transactions || '0'}
                    onChangeText={(newValue) => handleInputChange('sendTransactions', 'transactions', newValue)}
                  />
                  <span className='input-symbol'>
                    transactions
                  </span>
                </div>
              </div>
              {messages?.sendTransactions ?
                <div className="text-red-500 mt-1 text-sm">{messages.sendTransactions}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'interactModules') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Condition *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.interactModules?.modules || '0'}
                    onChangeText={(newValue) => handleInputChange('interactModules', 'modules', newValue)}
                  />
                  <span className='input-symbol'>
                    modules
                  </span>
                </div>
              </div>
              {messages?.interactModules ?
                <div className="text-red-500 mt-1 text-sm">{messages.interactModules}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'stakeLUME') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Amount *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.stakeLUME?.amount || '0'}
                    onChangeText={(newValue) => handleInputChange('stakeLUME', 'amount', newValue)}
                  />
                  <span className='input-symbol'>
                    LUME
                  </span>
                </div>
              </div>
              {messages?.stakeLUMEAmount ?
                <div className="text-red-500 mt-1 text-sm">{messages.stakeLUMEAmount}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Days *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.stakeLUME.condition}
                    onValueChange={(value) => handleInputChange('stakeLUME', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.stakeLUME?.days || '0'}
                    onChangeText={(newValue) => handleInputChange('stakeLUME', 'days', newValue)}
                  />
                  <span className='input-symbol'>
                    days
                  </span>
                </div>
              </div>
              {messages?.stakeLUMEDays ?
                <div className="text-red-500 mt-1 text-sm">{messages.stakeLUMEDays}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'decentralizationStake') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Amount *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.condition}
                    onValueChange={(value) => handleFormChange('root', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.decentralizationStake?.amount || '0'}
                    onChangeText={(newValue) => handleInputChange('decentralizationStake', 'amount', newValue)}
                  />
                  <span className='input-symbol'>
                    LUME
                  </span>
                </div>
              </div>
              {messages?.decentralizationStakeAmount ?
                <div className="text-red-500 mt-1 text-sm">{messages.decentralizationStakeAmount}</div> : null
              }
            </div>
          </div>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Rank *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.decentralizationStake.condition}
                    onValueChange={(value) => handleInputChange('decentralizationStake', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.decentralizationStake?.rank || '0'}
                    onChangeText={(newValue) => handleInputChange('decentralizationStake', 'rank', newValue)}
                  />
                  <span className='input-symbol'>

                  </span>
                </div>
              </div>
              {messages?.decentralizationStakeRank ?
                <div className="text-red-500 mt-1 text-sm">{messages.decentralizationStakeRank}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'firstUploadCascade') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Size *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.firstUploadCascade.condition}
                    onValueChange={(value) => handleInputChange('firstUploadCascade', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Transactions"
                    className='input has-symbol'
                    value={configForm?.firstUploadCascade?.size || '0'}
                    onChangeText={(newValue) => handleInputChange('firstUploadCascade', 'size', newValue)}
                  />
                  <span className='input-symbol'>
                    KB
                  </span>
                </div>
              </div>
              {messages?.firstUploadCascadeSize ?
                <div className="text-red-500 mt-1 text-sm">{messages.firstUploadCascadeSize}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    if (actionType === 'uploadedToCascade') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Type *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-full">
                  <Select
                    id="condition"
                    value={configForm.uploadedToCascade.type}
                    onValueChange={(value) => handleInputChange('uploadedToCascade', 'type', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {UPLOAD_CASCADE.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {renderUploadCascadeForm()}
        </>
      )
    }

    if (actionType === 'uptime') {
      return (
        <>
          <div className='mt-1'>
            <Label htmlFor="amount" className='text-base'>Uptime *</Label>
            <div className='input-wrapper'>
              <div className="flex justify-between gap-4">
                <div className="w-1/7">
                  <Select
                    id="condition"
                    value={configForm.uptime.condition}
                    onValueChange={(value) => handleInputChange('uptime', 'condition', value)}
                  >
                    <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>

                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {CONDITION_EXTEND.map((item, i) => (
                            <Select.Item
                              index={i}
                              key={item.value}
                              value={item.value}
                            >
                              <Select.ItemText>{item.label}</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon className='w-4 h-4' />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                </div>
                <div className="w-6/7">
                  <Input
                    id="days"
                    placeholder="Percent"
                    className='input has-symbol'
                    value={configForm?.uptime?.percent || '0'}
                    onChangeText={(newValue) => handleInputChange('uptime', 'percent', newValue)}
                  />
                  <span className='input-symbol'>
                    %
                  </span>
                </div>
              </div>
              {messages?.uptimePercent ?
                <div className="text-red-500 mt-1 text-sm">{messages.uptimePercent}</div> : null
              }
            </div>
          </div>
        </>
      )
    }

    return null;
  }

  return (
    <div>
      <div className="sticky z-[500] top-0 -left-10 -right-10 bg-lumera-navy pt-2 pb-2">
        <div className='flex justify-between items-center'>
          <AppLink
            href='/admin/campaigns/sprints/season-2/'
            className="flex items-start gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
          >
            <ChevronLeft className="w-5 h-5"/>Back to Loyalty Rules
          </AppLink>
          <div className='flex gap-3'>
            <AppLink
              href="/admin/campaigns/sprints/season-2/"
              className='!px-4 !py-2 !rounded-lg font-normal bg-lumera-red text-white hover:bg-lumera-red-light'
            >
              Close
            </AppLink>
            <AppButton
              onClick={updateLoyaltyRule}
              disabled={isLoading}
              className='disabled:opacity-45'
            >
              Save Rule
            </AppButton>
          </div>
        </div>
      </div>
      <div className='flex justify-between gap-5 mt-5 relative'>
        <AppLoading
          isLoading={isLoading || isCurrenciesLoading || isSectionsLoading}
          className="w-10 h-10 !border-2"
          iconWidth={20}
          iconHeight={20}
          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
        />
        <div className='w-1/3'>
          <Card elevate size="$4" bordered className='relative'>
            <Card.Header padded>
              <SectionTitle className='mb-0'>BASIC DETAILS</SectionTitle>
            </Card.Header>
            <div className='p-5 pt-0'>
              <div>
                <Label htmlFor='type'>Type *</Label>
                <Select
                  id="type"
                  value={loyaltyRuleForm.type}
                  onValueChange={(value) => handleFormChange('root', 'type', value)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder="Select a type" />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={200}>
                      <Select.Group>
                        {LOYALTY_RULE_TYPE.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.value}
                            value={item.value}
                          >
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon className='w-4 h-4' />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
                {messages?.type ?
                  <div className="text-red-500 mt-1 text-sm">{messages.type}</div> : null
                }
              </div>
              <div className='mt-1'>
                <Label htmlFor='ruleName'>Rule name *</Label>
                <Input
                  id="ruleName"
                  placeholder="e.g. Set up your profile"
                  className='input'
                  value={loyaltyRuleForm.name}
                  onChangeText={(value) => handleFormChange('root', 'name', value)}
                />
                {messages?.name ?
                  <div className="text-red-500 mt-1 text-sm">{messages.name}</div> : null
                }
              </div>
              <div className='mt-1'>
                <Label htmlFor='ruleDescription'>Rule description</Label>
                <TextArea
                  id="ruleDescription"
                  placeholder="e.g. Earn 100 points when all profile fields are completed."
                  className='input'
                  value={loyaltyRuleForm.description}
                  onChangeText={(value) => handleFormChange('root', 'description', value)}
                />
              </div>
              <div>
                <Label htmlFor='loyaltyRuleGroupId'>Section *</Label>
                <Select
                  id="loyaltyRuleGroupId"
                  value={loyaltyRuleForm.loyaltyRuleGroupId}
                  onValueChange={(value) => handleFormChange('root', 'loyaltyRuleGroupId', value)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder="Select a section" />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={200}>
                      <Select.Group>
                        {sections.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.id}
                            value={item.id}
                          >
                            <Select.ItemText>{item.name}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon className='w-4 h-4' />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
                {messages?.loyaltyRuleGroupId ?
                  <div className="text-red-500 mt-1 text-sm">{messages.loyaltyRuleGroupId}</div> : null
                }
              </div>
              <div className='mt-1'>
                <Label htmlFor='ruleDescription'>
                  Start time *
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Info className='h-4 w-4 ml-2' />
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
                      <div className='text-white max-w-52'>
                        The initial time to run the loyalty rule. This also determines the future run time.
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                </Label>
                <FullDateTimesPicker
                  defaultValue={new Date(loyaltyRuleForm.startTime)}
                  onDateChange={(date) => handleFormChange('root', 'startTime', !date ? '' : `${date}`)}
                />
                {messages?.startTime ?
                  <div className="text-red-500 mt-1 text-sm">{messages.startTime}</div> : null
                }
              </div>
              <div className='mt-1'>
                <Label htmlFor='ruleDescription'>
                  End time *
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Info className='h-4 w-4 ml-2' />
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
                      <div className='text-white max-w-52'>
                        Rewards will stop after end time.
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                </Label>
                <FullDateTimesPicker
                  defaultValue={new Date(loyaltyRuleForm.endTime)}
                  onDateChange={(date) => handleFormChange('root', 'endTime', !date ? '' : `${date}`)}
                />
                {messages?.endTime ?
                  <div className="text-red-500 mt-1 text-sm">{messages.endTime}</div> : null
                }
              </div>
            </div>
          </Card>
        </div>
        <div className='w-2/3'>
          <Card elevate size="$4" bordered className='relative !mb-5'>
            <Card.Header padded>
              <SectionTitle className='mb-0'>REWARD</SectionTitle>
            </Card.Header>
            <div className='p-5 pt-0'>
              <div>
                <Label htmlFor='startRange'>
                  Range *
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Info className='h-4 w-4 ml-2' />
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
                      <div className='text-white max-w-52'>
                        Enter the required range for a reward: a specific number (1), a range (1-100), or a minimum (1+).
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                </Label>
                <div>
                  <Input
                    id="startRange"
                    placeholder="0-1"
                    className='input w-full'
                    value={loyaltyRuleForm.startRange}
                    onChangeText={(value) => handleFormChange('root', 'startRange', value)}
                  />
                  {messages?.startRange ?
                    <div className="text-red-500 mt-1 text-sm">{messages.startRange}</div> : null
                  }
                </div>
              </div>
              <div className='mt-1'>
                <Label htmlFor='amount'>
                  Amount *
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Info className='h-4 w-4 ml-2' />
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
                      <div className='text-white max-w-52'>
                        The multiplier is applied to the points rewarded, enhancing the reward based on the user's token hold amount.
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                </Label>
                <div className='flex items-start gap-4'>
                  <div className="w-3/4">
                    <Input
                      id="amount"
                      placeholder="Points to reward"
                      className='input w-full'
                      value={loyaltyRuleForm.amount}
                      onChangeText={(value) => handleFormChange('root', 'amount', value)}
                    />
                    {messages?.amount ?
                      <div className="text-red-500 mt-1 text-sm">{messages.amount}</div> : null
                    }
                  </div>
                  <div className='w-1/4 relative'>
                    <Select
                      id="loyaltyCurrencyId"
                      value={loyaltyRuleForm.loyaltyCurrencyId}
                      onValueChange={(value) => handleFormChange('root', 'loyaltyCurrencyId', value)}
                    >
                      <Select.Trigger className='w-full' iconAfter={<ChevronDown className='w-4 h-4' />}>
                        <Select.Value placeholder="Select a currency" />
                      </Select.Trigger>

                      <Select.Content zIndex={200000}>
                        <Select.Viewport minWidth={200}>
                          <Select.Group>
                            {currencies.map((item, i) => (
                              <Select.Item
                                index={i}
                                key={item.id}
                                value={item.id}
                              >
                                <Select.ItemText>{item.name}</Select.ItemText>
                                <XStack flex={1} />
                                <Select.ItemIndicator marginLeft="auto">
                                  <CheckIcon className='w-4 h-4' />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Group>
                        </Select.Viewport>
                      </Select.Content>
                    </Select>
                    {messages?.loyaltyCurrencyId ?
                      <div className="text-red-500 mt-1 text-sm">{messages.loyaltyCurrencyId}</div> : null
                    }
                  </div>
                </div>
              </div>
              <div className='mt-1'>
                <Label htmlFor='frequency'>
                  How often can users earn rewards *
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Info className='h-4 w-4 ml-2' />
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
                      <div className='text-white max-w-80'>
                        Set the cooldown interval before a reward can be earned again.
                        <ul>
                          <li><strong>One time</strong> - doesn't reset.</li>
                          <li><strong>Hourly</strong> - resets at the start of each hour.</li>
                          <li><strong>Daily</strong> - resets at midnight UTC.</li>
                          <li><strong>Weekly</strong> - resets at midnight on Monday.</li>
                          <li><strong>Monthly</strong> - resets at midnight on the 1st of the month.</li>
                        </ul>
                      </div>
                    </Tooltip.Content>
                  </Tooltip>
                </Label>
                <Select
                  id="frequency"
                  value={loyaltyRuleForm.frequency}
                  onValueChange={(value) => handleFormChange('root', 'frequency', value)}
                >
                  <Select.Trigger iconAfter={<ChevronDown className='w-4 h-4' />}>
                    <Select.Value placeholder="Select a frequency" />
                  </Select.Trigger>

                  <Select.Content zIndex={200000}>
                    <Select.Viewport minWidth={200}>
                      <Select.Group>
                        {FREQUENCE.map((item, i) => (
                          <Select.Item
                            index={i}
                            key={item.value}
                            value={item.value}
                          >
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <XStack flex={1} />
                            <Select.ItemIndicator marginLeft="auto">
                              <CheckIcon className='w-4 h-4' />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Viewport>
                  </Select.Content>
                </Select>
                {messages?.frequency ?
                  <div className="text-red-500 mt-1 text-sm">{messages.frequency}</div> : null
                }
              </div>
            </div>
          </Card>
          <Card elevate size="$4" bordered className='relative !mb-5'>
            <Card.Header padded>
              <SectionTitle className='mb-0'>Custom Settings</SectionTitle>
            </Card.Header>
            <div className='p-5 pt-0'>
              <h3 className='relative flex items-center gap-2'>
                <span>Additional button</span>
                <Tooltip>
                  <Tooltip.Trigger>
                    <Info className='h-4 w-4' />
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
                    <div className='text-white max-w-52'>
                      Add an optional extra button alongside the default rule actions for linking to external pages or additional info.
                    </div>
                  </Tooltip.Content>
                </Tooltip>
              </h3>
              <div className="mt-1 w-full flex gap-3">
                <div className='w-1/2'>
                  <Label htmlFor='link'>
                    Link
                    <Tooltip>
                      <Tooltip.Trigger>
                        <Info className='h-4 w-4 ml-2' />
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
                        <div className='text-white max-w-52'>
                          The link will be automatically generated after saving successfully.
                        </div>
                      </Tooltip.Content>
                    </Tooltip>
                  </Label>
                  <Input
                    id="link"
                    placeholder="https://www.website.com"
                    className='input'
                    value={loyaltyRuleForm.metadata.cta.href}
                    onChangeText={(value) => handleFormChange('cta', 'href', value)}
                  />
                </div>
                <div className='w-1/2'>
                  <Label htmlFor='buttonText'>Button text *</Label>
                  <Input
                    id="buttonText"
                    placeholder="e.g Browse Items"
                    className='input'
                    value={loyaltyRuleForm.metadata.cta.label}
                    onChangeText={(value) => handleFormChange('cta', 'label', value)}
                  />
                  {messages?.label ?
                    <div className="text-red-500 mt-1 text-sm">{messages.label}</div> : null
                  }
                </div>
              </div>
            </div>
          </Card>
          <Card elevate size="$4" bordered className='relative'>
            <Card.Header padded>
              <SectionTitle className='mb-0'>Loyalty Rule Config</SectionTitle>
            </Card.Header>
            <div className='p-5 pt-0 min-h-80'>
              <div>
                <Label htmlFor="actionType" className='text-base'>Action type *</Label>
                <div className=''>
                  <Select
                    id="actionType"
                    value={actionType}
                    onValueChange={handleActionTypeChange}
                  >
                    <Select.Trigger width={'100%'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="N/A" />
                    </Select.Trigger>
                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {ACTION_TYPE?.map((item, index) => {
                            return (
                              <Select.Item
                                key={index}
                                index={index}
                                value={item.value}
                              >
                                <Select.ItemText>
                                  {item.label}
                                </Select.ItemText>
                              </Select.Item>
                            )
                          })}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                  {messages?.actionType ?
                    <div className="text-red-500 mt-1 text-sm">{messages.actionType}</div> : null
                  }
                </div>
              </div>
              <div className='mt-1'>
                <Label htmlFor="network" className='text-base'>Network *</Label>
                <div className=''>
                  <Select
                    id="network"
                    value={configForm.network}
                    onValueChange={(val) => handleInputChange('root', 'network', val)}
                  >
                    <Select.Trigger width={'100%'} iconAfter={<ChevronDown className='w-4 h-4' />}>
                      <Select.Value placeholder="N/A" />
                    </Select.Trigger>
                    <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {NETWORK?.map((item, index) => {
                            return (
                              <Select.Item
                                key={index}
                                index={index}
                                value={item.value}
                              >
                                <Select.ItemText>
                                  {item.label}
                                </Select.ItemText>
                              </Select.Item>
                            )
                          })}
                        </Select.Group>
                      </Select.Viewport>
                    </Select.Content>
                  </Select>
                  {messages?.network ?
                    <div className="text-red-500 mt-1 text-sm">{messages.network}</div> : null
                  }
                </div>
              </div>
              {actionType && actionType !== 'connect' ?
                <>
                  <div className='mt-1 hidden'>
                    <Label htmlFor="domain" className='text-base'>Verify Domain *</Label>
                    <div className='input-wrapper'>
                      <Input
                        id="domain"
                        placeholder="Verify Domain"
                        className='input'
                        value={configForm.domain}
                        onChangeText={(newValue) => handleInputChange('root', 'domain', newValue)}
                      />
                      {messages?.verifyURL ?
                        <div className="text-red-500 mt-1 text-sm">{messages.verifyURL}</div> : null
                      }
                    </div>
                  </div>
                  <div className='mt-1 hidden'>
                    <Label htmlFor="urlCheck" className='text-base'>URL Check *</Label>
                    <div className='input-wrapper'>
                      <Input
                        id="urlCheck"
                        placeholder="URL Check"
                        className='input'
                        value={configForm.urlCheck}
                        onChangeText={(newValue) => handleInputChange('root', 'urlCheck', newValue)}
                      />
                      {messages?.urlCheck ?
                        <div className="text-red-500 mt-1 text-sm">{messages.urlCheck}</div> : null
                      }
                    </div>
                  </div>
                </> : null
              }
              {renderConfigForm()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
