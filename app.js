const express = require("express"); //引入express 模块
const app = express(); //创建实例
const path = require("path");
app.use("/", express.static(path.join(__dirname, "./")));
const syncRequest = require("sync-request");
const log4js = require("log4js");
const CronJob = require("cron").CronJob;
const { appConfig } = require("./config");

let logConfig = {
  // 输出到控制台的内容，同时也输出到日志文件中
  replaceConsole: true,
  appenders: {
    out: {
      type: "stdout",
      layout: {
        type: "colored",
      },
    },
    files: {
      type: "file",
      filename: "testing.log",
    },
  },
  categories: {
    default: {
      appenders: ["out", "files"],
      level: "ALL",
    },
  },
  disableClustering: true,
};
log4js.configure(logConfig);
var logger = log4js.getLogger();

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/" + "index.html");
});
//获取session
function getSessionId(data) {
  let res = syncRequest(
    "POST",
    "https://yjsxx.whut.edu.cn/wx/api/login/checkBind",
    {
      json: data,
    }
  );
  let body = JSON.parse(res.getBody("utf8"));
  console.log(body);
  logger.debug("getSessionId", body);
  return body.data.sessionId;
}
//绑定信息
function bindUserInfo(sessionId, data) {
  let res = syncRequest(
    "POST",
    "https://yjsxx.whut.edu.cn/wx/api/login/bindUserInfo",
    {
      headers: {
        Cookie: "JSESSIONID=" + sessionId,
      },
      json: data,
    }
  );
  let body = JSON.parse(res.getBody("utf8"));
  console.log(body);
  logger.debug("bindUserInfo", body);
  return body.status;
}

//打卡
function sendInfo(sessionId) {
  let data = appConfig;
  let res = syncRequest(
    "POST",
    "https://yjsxx.whut.edu.cn/wx/./monitorRegister",
    {
      headers: {
        Cookie: "JSESSIONID=" + sessionId,
      },
      json: data,
    }
  );
  let body = JSON.parse(res.getBody("utf8"));
  console.log(body);
  logger.debug("sendInfo", body);
}

//取消绑定
function cancelBind(sessionId) {
  let res = syncRequest(
    "POST",
    "https://yjsxx.whut.edu.cn/wx/api/login/cancelBind",
    {
      headers: {
        Cookie: "JSESSIONID=" + sessionId,
      },
    }
  );
  let body = JSON.parse(res.getBody("utf8"));
  console.log(body);
  logger.debug("cancelBind", body);
}

function runEveryDay(data) {
  let timestr =
    parseInt(Math.random() * 60) +
    " " +
    parseInt(Math.random() * 60) +
    " " +
    parseInt(Math.random() * 10 + 2) +
    " * * *";
  new CronJob(
    timestr,
    function () {
      setTimeout(() => {
        if (run(data)) {
          logger.debug("打卡成功", data.sn);
        } else {
          logger.debug("打卡失败", data.sn);
        }
      }, parseInt(Math.random() * 10000000));
    },
    null,
    true
  );
}

function run(data) {
  let sessionId = getSessionId(data); //获取session
  let status = bindUserInfo(sessionId, data); //绑定信息
  if (status == false) {
    return false;
  }
  sendInfo(sessionId); //打卡
  cancelBind(sessionId); //解绑
  return true;
}

app.get("/test", (req, res) => {
  console.log(req.query.sn);
  console.log(req.query.idCard);
  let data = {
    sn: req.query.sn,
    idCard: req.query.idCard,
  };
  let status = run(data);
  if (status) {
    runEveryDay(data);
    res.send("success");
  } else {
    res.send("密码错误或没取消绑定");
  }
});

// 开启服务器
app.listen(666, () => {
  console.log("服务器在localhost:666端口开启。。。。。");
});
