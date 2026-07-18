import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useConfig, useSwitchChain, useReadContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { parseAbi } from 'viem'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Alert } from '../components/ui/alert'
import { Spinner } from '../components/ui/spinner'
import { toast } from 'sonner'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import PageHero from '../components/PageHero'
import { Shield, Download, AlertTriangle } from 'lucide-react'
import { CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA } from '../config'

const MOCK_USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)'
])

export default function AdminPage() {
  const { address, isConnected, chain } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const config = useConfig()

  const [withdrawing, setWithdrawing] = useState(false)

  // Fetch the contract's USDC balance
  const { data: balanceData, refetch } = useReadContract({
    chainId: ARBITRUM_SEPOLIA.chainId,
    address: MOCK_USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESS],
  })

  // Set up an interval to refresh balance automatically
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000)
    return () => clearInterval(interval)
  }, [refetch])

  const balanceUsdc = balanceData ? (Number(balanceData) / 1000000).toFixed(2) : '0.00'

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Wallet is not connected.')
      return
    }
    if (balanceData === 0n) {
      toast.error('Treasury is empty.')
      return
    }

    try {
      setWithdrawing(true)
      
      if (!chain || chain.id !== ARBITRUM_SEPOLIA.chainId) {
        try { await switchChainAsync({ chainId: ARBITRUM_SEPOLIA.chainId }) } 
        catch { throw new Error('Please switch to Arbitrum Sepolia network.') }
      }

      let safeMaxFee, safePriorityFee
      try {
        const feeProvider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA.rpcUrl)
        const feeData = await feeProvider.getFeeData()
        const mult = 1000n
        safeMaxFee = feeData.maxFeePerGas ? (feeData.maxFeePerGas * mult) / 100n : undefined
        safePriorityFee = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * mult) / 100n : undefined
      } catch {}

      const hash = await writeContractAsync({
        chainId: ARBITRUM_SEPOLIA.chainId,
        address: CONTRACT_ADDRESS,
        abi: parseAbi(CONTRACT_ABI),
        functionName: 'withdrawTreasury',
        args: [MOCK_USDC_ADDRESS],
        ...(safeMaxFee || safePriorityFee ? { maxFeePerGas: safeMaxFee, maxPriorityFeePerGas: safePriorityFee } : {}),
      })
      
      await waitForTransactionReceipt(config, { hash })
      
      toast.success('Treasury successfully withdrawn!')
      refetch()
    } catch (err) {
      let message = err.message
      if (message.includes('user rejected') || message.includes('User rejected')) message = 'Transaction was rejected in your wallet.'
      else if (message.includes('Not authorized')) message = 'You are not the owner of this contract!'
      toast.error(`Withdraw failed: ${message}`)
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <section>
      <PageHero 
        eyebrow="ADMINISTRATION" 
        title="Owner Treasury Control" 
        description="Monitor platform fees and withdraw accumulated USDC directly to the owner wallet." 
        icon={Shield} 
      />
      <div className="max-w-[800px] mx-auto px-5 pt-7 pb-20">
        
        {!isConnected && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--arb-border)] bg-[var(--arb-bg)]">
            <AlertTriangle size={15} className="text-[#12AAFF] flex-shrink-0" />
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Connect your wallet to access the owner portal. Only the initialized owner can withdraw funds.
            </p>
          </div>
        )}

        <SpotlightCard>
          <Card className="card-hover-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield size={16} className="text-[#12AAFF]" /> Platform Treasury</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-6 text-center py-6">
              
              <div>
                <div className="text-sm font-semibold text-[var(--text-3)] mb-2 uppercase tracking-wider">Current Accumulated Fees</div>
                <div className="text-5xl font-bold text-[#00D395]">${balanceUsdc} USDC</div>
              </div>

              <div className="mx-auto w-full max-w-sm">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full h-14 text-base shadow-lg shadow-blue-500/20" 
                  onClick={handleWithdraw}
                  disabled={withdrawing || !isConnected || balanceData === 0n}
                >
                  {withdrawing ? <Spinner size="md" /> : <span className="flex items-center gap-2"><Download size={20} /> Withdraw Treasury to Owner</span>}
                </Button>
                <div className="text-xs text-[var(--text-4)] mt-3">
                  This transaction calls <span className="font-mono bg-[var(--bg-2)] px-1 py-0.5 rounded text-[#12AAFF]">withdrawTreasury</span> on the registry.
                </div>
              </div>

            </CardBody>
          </Card>
        </SpotlightCard>
      </div>
    </section>
  )
}
