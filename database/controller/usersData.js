const { existsSync, writeJsonSync, readJSONSync } = require("fs-extra");
const moment = require("moment-timezone");
const path = require("path");
const axios = require("axios");
const _ = require("lodash");
const { CustomError, TaskQueue, getType } = global.utils;

const optionsWriteJSON = {
	spaces: 2,
	EOL: "\n"
};

const taskQueue = new TaskQueue(function (task, callback) {
	if (getType(task) === "AsyncFunction") {
		task()
			.then(result => callback(null, result))
			.catch(err => callback(err));
	}
	else {
		try {
			const result = task();
			callback(null, result);
		}
		catch (err) {
			callback(err);
		}
	}
});

const { creatingUserData } = global.client.database;

module.exports = async function (databaseType, userModel, api, fakeGraphql) {
	let Users = [];
	const pathUsersData = path.join(__dirname, "..", "data/usersData.json");

	switch (databaseType) {
		case "mongodb": {
			Users = (await userModel.find({}).lean()).map(user => _.omit(user, ["_id", "__v"]));
			break;
		}
		case "sqlite": {
			Users = (await userModel.findAll()).map(user => user.get({ plain: true }));
			break;
		}
		case "json": {
			if (!existsSync(pathUsersData))
				writeJsonSync(pathUsersData, [], optionsWriteJSON);
			Users = readJSONSync(pathUsersData);
			break;
		}
	}
	global.db.allUserData = Users;

	async function save(userID, userData, mode, path) {
		if (!userID || isNaN(userID)) return null; // 🛡️ حماية من ID فارغ
		try {
			let index = _.findIndex(global.db.allUserData, { userID });
			if (index === -1 && mode === "update") {
				try {
					await create_(userID);
					index = _.findIndex(global.db.allUserData, { userID });
				}
				catch (err) {
					return null;
				}
			}

			switch (mode) {
				case "create": {
					switch (databaseType) {
						case "mongodb":
						case "sqlite": {
							let dataCreated = await userModel.create(userData);
							dataCreated = databaseType === "mongodb" ?
								_.omit(dataCreated._doc, ["_id", "__v"]) :
								dataCreated.get({ plain: true });
							global.db.allUserData.push(dataCreated);
							return _.cloneDeep(dataCreated);
						}
						case "json": {
							const timeCreate = moment.tz().format();
							userData.createdAt = timeCreate;
							userData.updatedAt = timeCreate;
							global.db.allUserData.push(userData);
							writeJsonSync(pathUsersData, global.db.allUserData, optionsWriteJSON);
							return _.cloneDeep(userData);
						}
					}
					break;
				}
				case "update": {
					const oldUserData = global.db.allUserData[index];
					const dataWillChange = {};

					if (Array.isArray(path) && Array.isArray(userData)) {
						path.forEach((p, index) => {
							const key = p.split(".")[0];
							dataWillChange[key] = oldUserData[key];
							_.set(dataWillChange, p, userData[index]);
						});
					}
					else if (path && typeof path === "string" || Array.isArray(path)) {
						const key = Array.isArray(path) ? path[0] : path.split(".")[0];
						dataWillChange[key] = oldUserData[key];
						_.set(dataWillChange, path, userData);
					}
					else
						for (const key in userData)
							dataWillChange[key] = userData[key];

					switch (databaseType) {
						case "mongodb": {
							let dataUpdated = await userModel.findOneAndUpdate({ userID }, dataWillChange, { returnDocument: 'after' });
							dataUpdated = _.omit(dataUpdated._doc, ["_id", "__v"]);
							global.db.allUserData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "sqlite": {
							const user = await userModel.findOne({ where: { userID } });
							const dataUpdated = (await user.update(dataWillChange)).get({ plain: true });
							global.db.allUserData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "json": {
							dataWillChange.updatedAt = moment.tz().format();
							global.db.allUserData[index] = {
								...oldUserData,
								...dataWillChange
							};
							writeJsonSync(pathUsersData, global.db.allUserData, optionsWriteJSON);
							return _.cloneDeep(global.db.allUserData[index]);
						}
					}
					break;
				}
				case "remove": {
					if (index != -1) {
						global.db.allUserData.splice(index, 1);
						switch (databaseType) {
							case "mongodb": await userModel.deleteOne({ userID }); break;
							case "sqlite": await userModel.destroy({ where: { userID } }); break;
							case "json": writeJsonSync(pathUsersData, global.db.allUserData, optionsWriteJSON); break;
						}
					}
					break;
				}
			}
			return null;
		} catch (err) { return null; }
	}

	function getNameInDB(userID) {
		if (!userID) return null;
		const userData = global.db.allUserData.find(u => u.userID == userID);
		return userData ? userData.name : null;
	}

	async function getName(userID, checkData = true) {
		if (!userID || isNaN(userID)) return "Facebook User"; 
		if (checkData) {
			const name = getNameInDB(userID);
			if (name) return name;
		}
		try {
			const user = await axios.post(`https://www.facebook.com/api/graphql/?q=${`node(${userID}){name}`}`);
			return user.data[userID].name;
		} catch (error) { return getNameInDB(userID) || "Facebook User"; }
	}

	async function getAvatarUrl(userID) {
		if (!userID || isNaN(userID)) return "https://i.ibb.co/bBSpr5v/143086968.png";
		try {
			const user = await axios.post(`https://www.facebook.com/api/graphql/`, null, {
				params: { doc_id: "5341536295888250", variables: JSON.stringify({ height: 500, scale: 1, userID, width: 500 }) }
			});
			return user.data.data.profile.profile_picture.uri;
		} catch (err) { return "https://i.ibb.co/bBSpr5v/143086968.png"; }
	}

	async function create_(userID, userInfo) {
		if (!userID || isNaN(userID)) return null;
		const findInCreatingData = creatingUserData.find(u => u.userID == userID);
		if (findInCreatingData) return findInCreatingData.promise;

		const queue = new Promise(async function (resolve_, reject_) {
			try {
				const existingUser = global.db.allUserData.find(u => u.userID == userID);
				if (existingUser) return resolve_(_.cloneDeep(existingUser));

				userInfo = userInfo || (await api.getUserInfo(userID))[userID];
				if (!userInfo) return resolve_(null);

				let userData = {
					userID,
					name: userInfo.name,
					gender: userInfo.gender,
					vanity: userInfo.vanity,
					exp: 0, money: 0, banned: {}, settings: {}, data: {}
				};
				userData = await save(userID, userData, "create");
				resolve_(_.cloneDeep(userData));
			} catch (err) { resolve_(null); }
			creatingUserData.splice(creatingUserData.findIndex(u => u.userID == userID), 1);
		});
		creatingUserData.push({ userID, promise: queue });
		return queue;
	}

	async function create(userID, userInfo) {
		return new Promise((resolve) => {
			taskQueue.push(() => create_(userID, userInfo).then(resolve).catch(() => resolve(null)));
		});
	}

	async function get_(userID, path, defaultValue, query) {
		if (!userID || isNaN(userID)) return null;
		let userData;
		const index = global.db.allUserData.findIndex(u => u.userID == userID);
		if (index === -1) userData = await create_(userID);
		else userData = global.db.allUserData[index];

		if (!userData) return null;
		if (query && typeof query === "string") userData = fakeGraphql(query, userData);
		if (path) {
			if (typeof path === "string") return _.cloneDeep(_.get(userData, path, defaultValue));
			else if (Array.isArray(path)) return _.cloneDeep(_.times(path.length, i => _.get(userData, path[i], defaultValue[i])));
		}
		return _.cloneDeep(userData);
	}

	async function get(userID, path, defaultValue, query) {
		return new Promise((resolve) => {
			taskQueue.push(() => get_(userID, path, defaultValue, query).then(resolve).catch(() => resolve(null)));
		});
	}

	async function set(userID, updateData, path, query) {
		return new Promise((resolve) => {
			taskQueue.push(async function () {
				try {
					if (!userID || isNaN(userID)) return resolve(null);
					const userData = await save(userID, updateData, "update", path);
					if (query && typeof query === "string") return resolve(_.cloneDeep(fakeGraphql(query, userData)));
					return resolve(_.cloneDeep(userData));
				} catch (err) { resolve(null); }
			});
		});
	}

	async function refreshInfo(userID, updateInfoUser) {
		return new Promise((resolve) => {
			taskQueue.push(async function () {
				try {
					if (!userID || isNaN(userID)) return resolve(null);
					const infoUser = await get_(userID);
					updateInfoUser = updateInfoUser || (await api.getUserInfo(userID))[userID];
					const userData = await save(userID, { ...infoUser, name: updateInfoUser.name, vanity: updateInfoUser.vanity, gender: updateInfoUser.gender }, "update");
					resolve(_.cloneDeep(userData));
				} catch (err) { resolve(null); }
			});
		});
	}

	async function getMoney(userID) {
		return (await get_(userID, "money")) || 0;
	}

	async function addMoney(userID, money) {
		const currentMoney = await getMoney(userID);
		return await save(userID, currentMoney + money, "update", "money");
	}

	async function subtractMoney(userID, money) {
		const currentMoney = await getMoney(userID);
		return await save(userID, currentMoney - money, "update", "money");
	}

	async function remove(userID) {
		if (!userID || isNaN(userID)) return false;
		await save(userID, { userID }, "remove");
		return true;
	}

	return {
		existsSync: (userID) => global.db.allUserData.some(u => u.userID == userID),
		getName,
		getNameInDB,
		getAvatarUrl,
		create,
		refreshInfo,
		getAll: async () => _.cloneDeep(global.db.allUserData),
		get,
		set,
		getMoney,
		addMoney,
		subtractMoney,
		remove
	};
};

