import CryptoJS from "crypto-js"
// 可以通过 https://console.xfyun.cn/app/create 创建应用后获取APPID、API_SECRET、API_KEY
const APPID = '7312c819'
const API_SECRET = 'MzQyMTFmYTJjOWI1YjFkMGE1YzM5Mjll'
const API_KEY = '8e9ef21242ca68226b68d84558b79fd9'
let total_res = "";

// 已上传文件的ID
const FILE_IDS = [
    "f103fc48e9bd43bc93005190c711ee95",
    "fbb4042c9b7e4d6db37fbf6e579dd0bd",
    "48879a1519904d00b5f6c5d70af44d23"
];

function getWebsocketUrl() {
    return new Promise((resolve, reject) => {
      const apiKey = API_KEY;
      const apiSecret = API_SECRET;
      const url = 'wss://spark-api.xf-yun.com/v3.5/chat';
      const host = location.host;
      const date = new Date().toGMTString();
      const algorithm = 'hmac-sha256';
      const headers = 'host date request-line';
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v3.5/chat HTTP/1.1`;
      const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
      const signature = CryptoJS.enc.Base64.stringify(signatureSha);
      const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
      const authorization = btoa(authorizationOrigin);
      const websocketUrl = `${url}?authorization=${authorization}&date=${date}&host=${host}`;
      resolve(websocketUrl);
    });
  }
  


export default class TTSRecorder {
    constructor({appId = APPID} = {}) {
        this.appId = appId
        this.msgStore = null
        this.msgDom = null
        this.ttsWS = null
    }

    // 连接websocket
    connectWebSocket() {
        return getWebsocketUrl().then(url => {
            let ttsWS
            if ('WebSocket' in window) {
                ttsWS = new WebSocket(url)
            } else if ('MozWebSocket' in window) {
                ttsWS = new MozWebSocket(url)
            } else {
                alert('浏览器不支持WebSocket')
                return
            }
            this.ttsWS = ttsWS
            ttsWS.onopen = e => {
                this.webSocketSend()
            }
            ttsWS.onmessage = e => {
                this.result(e.data)
            }
            ttsWS.onerror = (e) => {
                console.error('WebSocket error:', e);
                alert('WebSocket error: 请检查控制台的详细信息');
              };
              
            ttsWS.onclose = e => {
                console.log(e)
            }
        })
    }


    // websocket发送数据
    webSocketSend() {
        var params = {
            "header": {
                "app_id": this.appId,
            },
            "parameter": {
                "chat": {
                    // 指定访问的领域,general指向V1.5版本,generalv2指向V2版本,generalv3指向V3版本 。
                    // 注意：不同的取值对应的url也不一样！
                    "domain": "generalv3.5",
                    // 核采样阈值。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高
                    "temperature": 0.5,
                    // 模型回答的tokens的最大长度
                    "max_tokens": 1024
                }
            },
            "payload": {
                "file_ids": FILE_IDS, // 使用文件ID
                "message": {
                    "text": this.msgStore.list
                }
            }
        }
        console.log(params, '请求的参数')
        this.ttsWS.send(JSON.stringify(params))
    }

    start(msgStore, msgDom) {
        this.msgStore = msgStore
        this.msgDom = msgDom.value
        total_res = ""; // 请空回答历史
        this.connectWebSocket().then(r => {
        })
    }

    // websocket接收数据的处理
    result(resultData) {
        let jsonData = JSON.parse(resultData)
        jsonData.payload.choices.text.forEach(res => {
            this.msgStore.aiAddMsg(res.content, jsonData.header.status)
            this.msgDom.scrollTop = this.msgDom.scrollHeight + 500
        })
        // 提问失败
        if (jsonData.header.code !== 0) {
            alert(`提问失败: ${jsonData.header.code}:${jsonData.header.message}`)
            console.error(`${jsonData.header.code}:${jsonData.header.message}`)
            return
        }
        if (jsonData.header.code === 0 && jsonData.header.status === 2) {
            // 关闭WebSocket
            this.ttsWS.close()
        }
    }
}
