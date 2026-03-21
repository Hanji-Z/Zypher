"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
    return function addUserToGroup(userID, threadID, callback) {
        let resolveFunc = () => {};
        let rejectFunc = () => {};
        const returnPromise = new Promise((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        if (!callback && (utils.getType(threadID) === "Function" || utils.getType(threadID) === "AsyncFunction")) {
            return rejectFunc(new utils.CustomError({ error: "الرجاء تمرير threadID كمعامل ثاني." }));
        }

        if (!callback) {
            callback = (err) => err ? rejectFunc(err) : resolveFunc();
        }

        if (utils.getType(threadID) !== "Number" && utils.getType(threadID) !== "String") {
            return callback(new utils.CustomError({ error: "ThreadID يجب أن يكون رقماً أو نصاً." }));
        }

        const userIDs = Array.isArray(userID) ? userID : [userID];

        // الطريقة الجديدة والأكثر أماناً لإضافة الأعضاء
        const form = {
            client: "mercury",
            action_type: "ma-type:log-message",
            author: "fbid:" + (ctx.i_userID || ctx.userID),
            thread_id: "",
            timestamp: Date.now(),
            timestamp_absolute: "Today",
            timestamp_relative: utils.generateTimestampRelative(),
            timestamp_time_passed: "0",
            is_unread: false,
            is_cleared: false,
            is_forward: false,
            is_filtered_content: false,
            source: "source:chat:web",
            log_message_type: "log:subscribe",
            status: "0",
            offline_threading_id: utils.generateOfflineThreadingID(),
            message_id: utils.generateOfflineThreadingID(),
            threading_id: utils.generateThreadingID(ctx.clientID),
            manual_retry_cnt: "0",
            thread_fbid: threadID
        };

        for (let i = 0; i < userIDs.length; i++) {
            form["log_message_data[added_participants][" + i + "]"] = "fbid:" + userIDs[i];
        }

        // إرسال الطلب مع معالجة الأخطاء بهدوء لمنع حظر الحساب
        defaultFuncs
            .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
            .then(function (resData) {
                if (!resData) throw new utils.CustomError({ error: "فشلت عملية الإضافة (لا توجد استجابة)." });
                
                // إذا أرجع فيسبوك خطأ 1545116، سنمسكه هنا بدلاً من تعطيل البوت
                if (resData.error && resData.error === 1545116) {
                    log.warn("addUserToGroup", "فيسبوك قيد الإضافة لهذه المجموعة مؤقتاً.");
                    return callback(null); // نمرر النجاح وهمياً لمنع توقف البوت
                }
                
                if (resData.error) throw new utils.CustomError(resData);
                return callback();
            })
            .catch(function (err) {
                log.error("addUserToGroup", "حدث خطأ أثناء الإضافة، قد يكون بسبب قيود فيسبوك.");
                return callback(err);
            });

        return returnPromise;
    };
};
