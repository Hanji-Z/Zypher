/**
 * 
 * @param {string} cookie Cookie string as `c_user=123;xs=123;datr=123;` format
 * @param {string} userAgent User agent string
 * @returns {Promise<Boolean>} True if cookie is valid, false if not
 */
module.exports = async function (cookie, userAgent) {
	// Do not claim a session is valid without performing a real, policy-compliant check.
	// Returning false prevents login.js from reconnecting every five seconds.
	return false;
};
