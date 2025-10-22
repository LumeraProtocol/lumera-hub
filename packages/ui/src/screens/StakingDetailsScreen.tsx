import { useState, useEffect, useMemo } from 'react';
import { H2, Card, Button, H3 } from 'tamagui';
import { Construction } from '@tamagui/lucide-icons';
import { ArrowUpRight, Copy, Check } from 'lucide-react';

interface IStakingDetailsScreen {
    validatorAddress: string;
}

type TDelegators = {
    address: string;
    stakedAmount: number;
}

const generateDelegators = (totalStaked: number) => {
    let delegators: TDelegators[] = [];
    let remainingStake = totalStaked;
    for (let i = 0; i < 35; i++) {
        const stake = Math.random() * (remainingStake / 3);
        remainingStake -= stake;
        delegators.push({
            address: `lume1${[...Array(38)].map(() => Math.random().toString(36)[2]).join('')}`,
            stakedAmount: stake
        });
        if (remainingStake <= 0) break;
    }
    return delegators;
};

const validator = {
    name: 'CosmoStation', 
    stakedAmount: 12500000, 
    commission: 5.0, 
    votingPower: 7.8, 
    uptime: 99.98, 
    status: 'active',
    details: {
        description: "Cosmostation is an enterprise-level validator infrastructure provider and end-user application developer based in Seoul, South Korea. We are a team of engineers, designers, and dreamers who are passionate about building a transparent and decentralized future.",
        address: "lumevaloper1k2g3h4j5k6l7m8n9b0v1c2x3d4f5g6h7j8k9l",
        website: "https://www.cosmostation.io",
        securityContact: "security@cosmostation.io",
        status: "Bonded",
        delegators: generateDelegators(12500000),
    }
}

export const StakingDetailsScreen = ({
    validatorAddress,
}: IStakingDetailsScreen) => {
    const [isCopied, setCopied] = useState(false);
    const [last100Blocks, setLast100Blocks] = useState<string[]>([]);

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(validatorAddress)
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 3000)
    }
    const uptime = 99.98;
    useEffect(() => {
        const generateInitialBlocks = () => {
            const blockTypes = ['signed', 'signed', 'signed', 'proposed', 'missed'];
            let blocks = Array.from({length: 100}, () => blockTypes[Math.floor(Math.random() * (uptime > 99 ? 4 : 5))]);
            setLast100Blocks(blocks);
        }
        generateInitialBlocks();
        const interval = setInterval(() => {
            setLast100Blocks(prev => [...prev.slice(1), ['signed', 'signed', 'signed', 'proposed', 'missed'][Math.floor(Math.random() * (uptime > 99 ? 4 : 5))]]);
        }, 2000);
        return () => clearInterval(interval);
    }, [uptime]);
  
    return (
        <div className="space-y-8">
            <div className='flex justify-between gap-5 w-full items-center flex-wrap sm:flex-nowrap'>
                <H2 className='!font-bold text-white text-[32px] leading-none'>CosmoStation</H2>
                <div className='btn-primary'>
                <Button>
                    <span className='font-bold whitespace-nowrap'>Delegate</span>
                </Button>
                </div>
            </div>
            <div className='flex justify-between gap-5 mt-5 w-full'>
                <div className='w-2/3'>
                    <Card bordered className='w-full portfolio-overview'>
                        <Card.Header padded>
                        <H3>Description</H3>
                        <div className='mt-3 text-lumera-label text-base'>
                            Cosmostation is an enterprise-level validator infrastructure provider and end-user application developer based in Seoul, South Korea. We are a team of engineers, designers, and dreamers who are passionate about building a transparent and decentralized future.
                        </div>
                        </Card.Header>
                    </Card>
                    <Card bordered className='w-full portfolio-overview mt-5'>
                        <Card.Header padded>
                        <H3>Last 100 Blocks</H3>
                        <div className='mt-3'>
                            <ul className='flex gap-8 list-none text-base'>
                                <li>
                                    <span className='inline-block w-3.5 h-3.5 bg-lumera-green rounded-full mr-1'></span> Signed: 70
                                </li>
                                <li>
                                    <span className='inline-block w-3.5 h-3.5 bg-lumera-blue-light rounded-full mr-1'></span> Proposed: 70
                                </li>
                                <li>
                                    <span className='inline-block w-3.5 h-3.5 bg-red-600 rounded-full mr-1'></span> Missed: 0
                                </li>
                            </ul>
                            <div className="grid grid-cols-10 md:grid-cols-20 gap-1.5 mt-3">{last100Blocks.map((block, index) => (<div key={index} className={`h-6 rounded ${block === 'signed' ? 'bg-green-500' : block === 'proposed' ? 'bg-sky-500' : 'bg-red-500'} transition-colors duration-500`} title={`Block ${index+1}: ${block}`}></div>))}</div>
                        </div>
                        </Card.Header>
                    </Card>
                </div>
                <div className='w-1/3'>
                    <Card bordered className='w-full portfolio-overview'>
                        <Card.Header padded>
                        <H3>Details</H3>
                        <div className='mt-3 text-base'>
                            <div className='flex justify-between items-center gap-4 w-full'>
                                <span className='text-lumera-label'>Website</span>
                                <a href='#' target='_blank' rel='noopener noreferrer' className='text-lumera-label hover:text-lumera-teal flex gap-0.5 items-center'>
                                    cosmostation.io <ArrowUpRight className="w-3 h-3"/>
                                </a>
                            </div>
                            <div className='flex justify-between items-center gap-4 w-full mt-4'>
                                <span className='text-lumera-label'>Security Contact</span>
                                <a href='#' target='_blank' rel='noopener noreferrer' className='text-lumera-label hover:text-lumera-teal flex gap-0.5 items-center'>
                                    security@cosmostation.io
                                </a>
                            </div>
                            <div className='w-full mt-4'>
                                <span className='text-lumera-label'>Wallet Address</span>
                                <div className="flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg mt-2">
                                    <span className="font-mono text-sm text-gray-300 truncate">{validatorAddress}</span>
                                    <button onClick={handleCopyAddress} className="ml-auto p-1 text-gray-400 hover:text-white transition-colors">
                                        {!isCopied ?
                                            <Copy className="w-4 h-4"/> :
                                            <Check className="w-4 h-4"/>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                        </Card.Header>
                    </Card>
                    <Card bordered className='w-full portfolio-overview mt-5'>
                        <Card.Header padded>
                            <H3>Statistics</H3>
                            <div className='mt-3 text-base'>
                                <div className='flex justify-between items-center gap-4 w-full'>
                                    <span className='text-lumera-label'>Total Staked</span>
                                    <a href='#' target='_blank' rel='noopener noreferrer' className='text-white flex gap-0.5 items-center'>
                                        12,500,000 LUME
                                    </a>
                                </div>
                                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                                    <span className='text-lumera-label'>Commission</span>
                                    <a href='#' target='_blank' rel='noopener noreferrer' className='text-white flex gap-0.5 items-center'>
                                        5%
                                    </a>
                                </div>
                                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                                    <span className='text-lumera-label'>Voting Power</span>
                                    <a href='#' target='_blank' rel='noopener noreferrer' className='text-white flex gap-0.5 items-center'>
                                        7.8%
                                    </a>
                                </div>
                                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                                    <span className='text-lumera-label'>Uptime</span>
                                    <a href='#' target='_blank' rel='noopener noreferrer' className='text-lumera-green flex gap-0.5 items-center'>
                                        99.98%
                                    </a>
                                </div>
                                <div className='flex justify-between items-center gap-4 w-full mt-3'>
                                    <span className='text-lumera-label'>Status</span>
                                    <a href='#' target='_blank' rel='noopener noreferrer' className='text-lumera-green-light flex gap-0.5 items-center'>
                                        Bonded
                                    </a>
                                </div>
                            </div>
                        </Card.Header>
                    </Card>
                </div>
            </div>
            <Card elevate size="$4" bordered className='w-full'>
                 <Card.Header padded>
                    <H3>Delegators ({ validator.details.delegators.length })</H3>
                    <div className='mt-3'>
                        <div className="overflow-x-auto">
                            <div className="min-w-[500px] space-y-2">
                                <div className="grid grid-cols-10 gap-4 px-4 py-3 text-sm font-semibold text-gray-400">
                                    <div className="col-span-5">Delegator Address</div>
                                    <div className="col-span-2 text-right">Stake Share</div>
                                    <div className="col-span-3 text-right">Amount</div>
                                </div>
                                {validator.details.delegators.map((d, i) => (
                                    <div key={i} className="grid grid-cols-10 gap-4 p-3 bg-gray-900/40 rounded-lg text-sm">
                                        <div className="col-span-5 font-mono text-gray-300 truncate">{d.address}</div>
                                        <div className="col-span-2 text-right text-indigo-400">
                                            {((d.stakedAmount / validator.stakedAmount) * 100).toFixed(2)}%
                                        </div>
                                        <div className="col-span-3 text-right font-mono text-white">
                                            {d.stakedAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} LUME
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card.Header>
            </Card>
        </div>
    )
}