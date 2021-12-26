import Swapper from './swapper.js'
import config from './config.js'

(async () => {
    const connectButton = document.getElementById("connect")
    const swapButton = document.getElementById("swap")
    const approveButton = document.getElementById("approve")
    const inputCurrency = document.getElementById("inputCurrency")
    const outputCurrency = document.getElementById("outputCurrency")
    const inputSelectLabel = document.getElementById("inputSelectLabel")
    const outputSelectLabel = document.getElementById("outputSelectLabel")
    const selectModal = document.getElementById("selectmodal")
    const closeModal = document.getElementById("closeModal")
    const tokenListContainer = document.getElementById("tokenList")
    const switchValues = document.getElementById("switch")
    const searchToken = document.getElementById("searchToken")

    inputSelectLabel.addEventListener("click", () => handleSelect("inputSelectLabel"),false)
    outputSelectLabel.addEventListener("click", () => handleSelect("outputSelectLabel"),false)
    closeModal.addEventListener("click", handleCloseModal, false)
    switchValues.addEventListener("click", () => {
        const inputCurrInputValue = inputCurrency.value
        const outputCurrInputValue = outputCurrency.value
        const inputCurrLableValue = inputSelectLabel.innerText
        const outputCurrLabelValue = outputSelectLabel.innerText

        inputCurrency.value = outputCurrInputValue
        outputCurrency.value = inputCurrInputValue
        inputSelectLabel.innerText = outputCurrLabelValue
        outputSelectLabel.innerText = inputCurrLableValue
    }, false)

    const weth = config.tokens.WBNB.address 
    const luffy = config.tokens.LUFFYBSC.address
    delete config.tokens.LUFFYBSC
    const defaultSlippage = config.defaultSlippage

    let swapper = new Swapper(config)

    const selectLabels = {
        inputSelectLabel,
        outputSelectLabel
    }

    let tokenOptions = config.tokens
    
    function getModalOptions() {
        return document.getElementsByClassName("modal-option")
    }
    
    function handleCloseModal() {
        selectModal.style.display = "none";
    }

    function renderOptions(clicked){
        
        let tokenHTMLOptions = ""
        const inputSelectLabelValue = inputSelectLabel.innerText
        const outputSelectLabelValue = outputSelectLabel.innerText
        const selectedOptions = {
            inputSelectLabel: inputSelectLabelValue,
            outputSelectLabel: outputSelectLabelValue
        }
        const other = clicked === "inputSelectLabel" ? "outputSelectLabel" : "inputSelectLabel"
        const clickedOption = selectedOptions[clicked]
        const otherOption = selectedOptions[other]
        Object.values(tokenOptions).forEach(tokenOption => {
            const isThis = clickedOption === tokenOption.symbol
            const isTheOther = otherOption === tokenOption.symbol
            if(!isTheOther){
                tokenHTMLOptions += `<div class="modal-option">${tokenOption.symbol} ${isThis ? '(selected)' : ''}</div>`
            }
        })
        tokenListContainer.innerHTML = tokenHTMLOptions
        for(const modalOption of getModalOptions()){
            modalOption.addEventListener('click',() => handleSelectLabelOption(clicked, modalOption.innerText), false)
        }

        searchToken.addEventListener('keyup', async () => {
            const value = searchToken.value
            let present = false
            for(const tokenOption of Object.values(tokenOptions)){
                if(tokenOption.address.toLowerCase() === value.toLowerCase()){
                    present = true
                    break;
                }
            }
            if(!present && value.length >= 40){
                const tokenDetails = await swapper.getTokenDetails(value)
                tokenOptions = {[tokenDetails.symbol]: tokenDetails, ...tokenOptions}
                searchToken.value = ""
                renderOptions(clicked)
            }
        })
    }

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

    async function handleSelect(label){
        selectModal.style.display = "flex"
        renderOptions(label)
    }
    
    async function handleSelectLabelOption(label, value){
        const _label = selectLabels[label]
        const _value = value.replace(" (selected)", "")
        _label.innerText = _value
        handleCloseModal()
    }

    async function submitForm() {
        const swapperConfig = {
            amountInValue: inputCurrency.value,
            amountInDecimals: 18,
            amountOutValue: outputCurrency.value,
            amountOutDecimals: 18,
            fromToken: luffy,
            toToken: weth,
        }
        await swapper.swap(false, swapperConfig)
        return true
    }

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
