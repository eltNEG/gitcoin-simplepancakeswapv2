import Swapper from './swapper.js'
import config from './config.js'

(async () => {
    const connectButton = document.getElementById("connect")
    const swapButton = document.getElementById("swap")
    const approveButton = document.getElementById("approve")
    const inputCurrency = document.getElementById("inputCurrency")
    const outputCurrency = document.getElementById("outputCurrency")

    const weth = config.tokens.WBNB.address 
    const luffy = config.tokens.LUFFYBSC.address
    const defaultSlippage = config.defaultSlippage

    let swapper = new Swapper(config)

    connectButton.addEventListener("click", async () => {
        if(!swapper.provider){
            await swapper.init()
            if(swapper.provider){
                connectButton.style.display = "none"
                swapButton.style.display = "inline-block"
                inputCurrency.disabled = false
                outputCurrency.disabled = false
            }
        }
    })

    approveButton.addEventListener("click", async () => {
        const amount = inputCurrency.value
        await swapper.approve(luffy, amount, 18)
        swapButton.style.display = "inline-block"
        approveButton.style.display = "none"
    })

    swapButton.addEventListener("click", async () => {
        const swapperConfig = {
            amountInValue: inputCurrency.value,
            amountInDecimals: 18,
            amountOutValue: outputCurrency.value,
            amountOutDecimals: 18,
            fromToken: luffy,
            toToken: weth,
        }
        await swapper.swap(false, swapperConfig)
    })

    async function onchange(from, to, reversed=false) {
        const inout = {inputCurrency, outputCurrency}
        const inn = inout[from]
        const out = inout[to]
        const inValue = inn.value
        let outValue = 0
        if(Number(inValue) > 0){
            const [inputToken, outputToken] = reversed ? [weth, luffy] : [luffy, weth]
            const amountOut = await swapper.handleCurrencyValueChange(inValue, 18, inputToken, outputToken)
            const approvedValue = await swapper.getAllowance(luffy)
            const compareValue = reversed ? amountOut : inValue*10**18
            if(compareValue > approvedValue){
                swapButton.style.display = "none"
                approveButton.style.display = "inline-block"
            }else {
                swapButton.style.display = "inline-block"
                approveButton.style.display = "none"
            }
            const slippage = reversed ? 1+defaultSlippage : 1-defaultSlippage
            outValue = (amountOut*slippage/10**18).toFixed(8)
        }
        out.value = outValue
    }

    inputCurrency.onkeyup = () => onchange("inputCurrency", "outputCurrency")
    outputCurrency.onkeyup = () => onchange("outputCurrency", "inputCurrency", true)
    
})()
