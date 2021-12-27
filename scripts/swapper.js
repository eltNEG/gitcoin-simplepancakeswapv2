import { ethers } from './ethers.js'
const routerABI = [
    'function WETH() view returns(address)',
    'function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  
    'function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)',
  
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
    'function getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)',

    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
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
        const {chainId} = (await this.provider.getNetwork())
        console.log(chainId)
        if(chainId !== this.config.chainId){
            window.alert(`Wrong network! Please connect to ${this.config.networkName}`)
            this.provider = null
            return
        }
        this.contract = new ethers.Contract(this.config.pancakeswapV2Router, routerABI, this.provider.getSigner())
    }

    async handleCurrencyValueChange(amountInValue, amountInDecimals, tokenIn, tokenOut, bothTokens=false) {
        const amountIn = ethers.utils.parseUnits(amountInValue, amountInDecimals)
        const path = bothTokens ? [tokenIn, this.config.tokens.BNB.address, tokenOut] : [tokenIn, tokenOut]
        const amountsOut = await this.contract.getAmountsOut(amountIn, path)
        return Number(amountsOut[path.length-1])
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
    
    async getTokenDetails(address){
        const signer = await this.provider.getSigner()
        const tokenContract = new ethers.Contract(address, tokenABI, signer)
        const symbol = await tokenContract.symbol()
        const decimals = await tokenContract.decimals()
        return {address, symbol, decimals}
    }
    
    async swap({bnbInput, bnbOuput}, {amountInValue, amountInDecimals, amountOutValue, amountOutDecimals, fromToken, toToken}){
        const toAddress = (await this.provider.getSigner()).getAddress()
        const deadline = Math.ceil(Date.now()/1000) + 20*60
        const amountOut = ethers.utils.parseUnits(amountOutValue, amountOutDecimals)
        const amountInMax = ethers.utils.parseUnits(amountInValue, amountInDecimals)
        const path = [fromToken, toToken]
        if(bnbInput){
          this.contract.swapETHForExactTokens(amountOut, path, toAddress, deadline, {value: amountInMax})
        }else if(bnbOuput) {
          this.contract.swapTokensForExactETH(amountOut, amountInMax, path, toAddress, deadline)
        }else {
            this.contract.swapExactTokensForTokens(amountInMax, amountOut, [path[0], this.config.tokens.BNB.address, path[1]], toAddress, deadline)
        }
    }
    
}
