<script>
    // vercel analytics
    import { dev } from '$app/environment'
    import { inject } from '@vercel/analytics'

    inject({ mode: dev ? 'development' : 'production' })

    // Your selected Skeleton theme:
    import '@skeletonlabs/skeleton/themes/theme-gold-nouveau.css'

    // This contains the bulk of Skeletons required styles:
    import '@skeletonlabs/skeleton/styles/skeleton.css'

    // Finally, your application's global stylesheet (sometimes labeled 'app.css')
    import '../app.postcss'

    import {
        computePosition,
        autoUpdate,
        offset,
        shift,
        flip,
        arrow,
    } from '@floating-ui/dom'

    import { popup } from '@skeletonlabs/skeleton'

    import { getUIFormatNumber } from '../utils'
    import { BasicMetricsCls, PricesCls, prices, basic_metrics } from '../store'
    import { onDestroy } from 'svelte'

    import { storePopup } from '@skeletonlabs/skeleton'
    storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow })

    let metric = new BasicMetricsCls()
    let price = new PricesCls()

    const unsubscribe_metric = basic_metrics.subscribe((obj) => (metric = obj))
    const unsubscribe_price = prices.subscribe((obj) => (price = obj))

    const popupFeatured = {
        // Represents the type of event that opens/closed the popup
        event: 'click',
        // Matches the data-popup value on your popup element
        target: 'popupFeatured',
        // Defines which side of your trigger the popup will appear
        placement: 'bottom',
    }

    onDestroy(unsubscribe_metric)
    onDestroy(unsubscribe_price)
</script>

<div class="container">
    <div class="item">
        <div>
            <p>block:</p>
            <p>{metric.current_block}</p>
        </div>
    </div>

    <div class="item">
        <div>
            <img src="/pls.png" alt="pls.png" />
            <p>{getUIFormatNumber(price['PLS'], 5)}</p>
        </div>
    </div>

    <div class="item">
        <div>
            <img src="/pulsex.png" alt="pulsex.png" />
            <p>{getUIFormatNumber(price['PLSX'], 6)}</p>
        </div>
    </div>

    <div class="item">
        <div>
            <img src="/inc.png" alt="inc.png" />
            <p>{getUIFormatNumber(price['INC'])}</p>
        </div>
    </div>

    <div class="item">
        <div>
            <img src="/phex.png" alt="phex.png" />
            <p>{getUIFormatNumber(price['pHEX'])}</p>
        </div>
    </div>

    <div class="item">
        <div use:popup={popupFeatured} class="donate-btn">
            Donate<span class="heart">❤️️</span>
        </div>
    </div>
    <div class="card p-4 donate-card" data-popup="popupFeatured">
        <div class="donate">
            <img src="eth.svg" alt="eth" />
            <p>0xb824F996BaCDc67cF05d304259c29343a4379Ba4</p>
        </div>
        <div class="donate">
            <img src="pls.png" alt="pls" />
            <p>0xb824F996BaCDc67cF05d304259c29343a4379Ba4</p>
        </div>
        <div class="donate">
            <img src="xen.png" alt="XEN" />
            <p>0xb824F996BaCDc67cF05d304259c29343a4379Ba4</p>
        </div>

        <div class="donate">
            <div class="coffee">
                <a href="https://www.buymeacoffee.com/rsdev"
                    ><img
                        src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=rsdev&button_colour=000000&font_colour=ffffff&font_family=Poppins&outline_colour=ffffff&coffee_colour=FFDD00"
                        alt="Buy Me A Coffee"
                        style="height: 8vh !important;width: 26vh !important;"
                    /></a
                >
            </div>
        </div>

        <div class="arrow variant-filled-secondary" />
    </div>
</div>
<slot />

<div class="footer">
    <a href="https://rskrzydelski.dev">
        <img src="/footer.png" alt="rskrzydelski" />
    </a>
    <span>telegram: </span>
    <a href="https://t.me/+HP5p2Z33JatlZTBk">
        <img src="/telegram.png" alt="telegram" />
    </a>
</div>

<style>
    .coffee {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
    }

    .container {
        display: flex;
        flex-wrap: wrap;
        max-width: 100vw;
        justify-content: center;
        align-items: center;
        font-size: 18px;
    }

    .item {
        flex-basis: 16.66%;
        box-sizing: border-box;
        max-height: 10vh;
    }
    .item div {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        padding: 5px;
    }
    .item img {
        height: 4vh;
        width: 4vh;
    }
    @media screen and (max-width: 800px) {
        .item img {
            height: 2vh;
            width: 2vh;
        }
    }

    .item p {
        height: 5vh;
        margin: 0 4px;
        line-height: 5vh;
    }

    .footer {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 auto;
        text-align: center;
        margin: 2vh;
        max-height: 5vh;
    }
    .footer img {
        max-height: 5vh;
    }
    .footer span {
        font-size: 12px;
        color: grey;
    }

    .donate-btn {
        font-size: 18px;
    }
    .heart {
        width: 24px;
        font-size: 14px;
        animation: heartbeat 2s linear forwards infinite;
    }
    @keyframes heartbeat {
        0% {
            font-size: 14px;
        }
        20% {
            font-size: 18px;
        }
        40% {
            font-size: 24px;
        }
        60% {
            font-size: 18px;
        }
        80% {
            font-size: 14px;
        }
        100% {
            font-size: 14px;
        }
    }

    .donate-btn {
        cursor: pointer;
    }
    .donate-card {
        background: black;
    }
    .donate {
        display: flex;
        flex-direction: row;
        text-align: center;
        padding: 5px;
    }
    .donate img {
        height: 3vh;
        width: 3vh;
    }
    .donate p {
        margin-left: 10px;
    }

    @media screen and (max-width: 768px) {
        .container {
            font-size: 16px;
        }
        .item {
            flex-basis: 33.33%;
        }
        .item img {
            height: 3vh;
            width: 3vh;
        }
    }

    @media screen and (max-width: 480px) {
        .container {
            font-size: 14px;
        }
        .item {
            flex-basis: 100%;
        }
        .item img {
            height: 2vh;
            width: 2vh;
        }
    }
</style>
