import { ethers } from './ethers.js'
const routerABI = [
    'function WETH() view returns(address)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)',
  
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)',
]

const tokenABI = [
    'function name() view returns(string memory)',  
    'function symbol() view returns(string memory)',  
    'function decimals() view returns(uint)',  
    'function approve(address spender, uint256 amount)',
    'function allowance(address owner, address spender) external view returns (uint)',
]

export default class Swap {
    provider = null
    contract = null
    web3Modal = null

    config = null

    constructor(config){
        const Web3Modal = window.Web3Modal.default;
        const WalletConnectProvider = window.WalletConnectProvider.default;
        const web3Modal = new Web3Modal({
            network: "mainnet",
            providerOptions: {
                walletconnect: {
                    package: WalletConnectProvider,
                    options: {
                        infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
                    }
                },
                disableInjectedProvider: false,
            }
        });
        this.web3Modal = web3Modal
        this.config = config
    }

    async init(){
        const provider = await this.web3Modal.connect();
        this.provider = new ethers.providers.Web3Provider(provider)
        this.contract = new ethers.Contract(this.config.pancakeswapV2Router, routerABI, this.provider.getSigner())
    }

    async handleCurrencyValueChange(amountInValue, amountInDecimals, tokenIn, tokenOut) {
        const amountIn = ethers.utils.parseUnits(amountInValue, amountInDecimals)
        const [,amountOut] = await this.contract.getAmountsOut(amountIn, [tokenIn, tokenOut])
        return Number(amountOut)
    }

    async getAllowance(token) {
        const signer = await this.provider.getSigner()
        const tokenContract = new ethers.Contract(token, tokenABI, signer)
        const approvedValue = await tokenContract.allowance(signer.getAddress(), this.config.pancakeswapV2Router)
        return Number(approvedValue)
    }
    
    async approve(token, amount, decimal){
        const signer = await this.provider.getSigner()
        const tokenContract = new ethers.Contract(token, tokenABI, signer)
        const tx = await tokenContract.approve(this.config.pancakeswapV2Router, ethers.utils.parseUnits(amount, decimal))
        await tx.wait()
    }
    
    async swap(fromBase, {amountInValue, amountInDecimals, amountOutValue, amountOutDecimals, fromToken, toToken}){
        const toAddress = (await this.provider.getSigner()).getAddress()
        const deadline = Math.ceil(Date.now()/1000) + 20*60
        const amountOut = ethers.utils.parseUnits(amountOutValue, amountOutDecimals)
        const amountInMax = ethers.utils.parseUnits((Number(amountInValue)*1.05).toFixed(8), amountInDecimals)
        const path = [fromToken, toToken]
        if(fromBase){
          this.contract.swapETHForExactTokens(amountOut, path, toAddress, deadline, {value: amountInMax})
        }else {
          this.contract.swapTokensForExactETH(amountOut, amountInMax, path, toAddress, deadline)
        }
    }
    
}
