Object.defineProperty(exports, "__esModule", {
    value: true
});
var Promise = require('bluebird');
var request = require('request');

var pRequest = function (options) {
    return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) reject(err);
            resolve({ response, body });
        });
    });
};

function buildOptions(token, endPoint, path, method) {
    var body = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    return {
        uri: endPoint + path,
        headers: {
            Authorization: `Bearer ${ token }`,
            Accept: 'application/json',
            'GoCardless-Version': '2015-07-06',
            'Content-Type': 'application/json'
        },
        body,
        method,
        json: true
    };
}

function goCardlessRedirectRequest(options) {
    return pRequest(options).then(response => {
        if (!response.body.redirect_flows) throw response.body;else return response.body;
    });
}

function goCardlessRequest(options) {
    return pRequest(options);
}

function yyyymmdd(date) {
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = date.getDate().toString();
    return `${ yyyy }-${ mm[1] ? mm : `0${ mm[0] }` }-${ dd[1] ? dd : `0${ dd[0] }` }`; // padding
}

class GoCardless {

    constructor(config) {
        this.endPoint = config.sandbox ? 'https://api-sandbox.gocardless.com' : 'https://api.gocardless.com';
        if (!config.token) throw new Error('missing config.token');
        this.token = config.token;
    }

    /**
     * Generic GC API request
     * @param  {string} method "POST", "GET", "PUT", "DELETE"
     * @param  {string} path
     * @param  {mixed} body
     * @return {Promise<response>}
     */
    request(method, path) {
        var body = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

        var options = buildOptions(this.token, this.endPoint, path, method, body);
        return goCardlessRequest(options);
    }

    startRedirectFlow(description, sessionId, succesRedirectUrl, customer) {
        var body = {
            redirect_flows: {
                description,
                session_token: sessionId,
                success_redirect_url: succesRedirectUrl
            }
        };
        if (customer) {
            body.redirect_flows.prefilled_customer = customer;
        }
        var path = '/redirect_flows';
        var options = buildOptions(this.token, this.endPoint, path, 'POST', body);
        return goCardlessRedirectRequest(options);
    }

    getRedirectFlow(redirectFlowId) {
        var path = `/redirect_flows/${ redirectFlowId }`;
        var options = buildOptions(this.token, this.endPoint, path, 'GET');
        return goCardlessRedirectRequest(options);
    }

    completeRedirectFlow(redirectFlowId, sessionId) {
        var body = {
            data: {
                session_token: sessionId
            }
        };
        var path = `/redirect_flows/${ redirectFlowId }/actions/complete`;
        var options = buildOptions(this.token, this.endPoint, path, 'POST', body);
        return goCardlessRedirectRequest(options);
    }

    /**
     * Sends a request for payment creation
     * https://developer.gocardless.com/pro/2015-07-06/#payments-create-a-payment
     * @param mandateID REQUIRED ID of the mandate against which payment should be collected
     * @param amount REQUIRED amount in pence, cents or öre
     * @param charge_date a future date on which the payment should be collected
     * @param currency defaults to EUR, either EUR, GBP or SEK
     * @param description human readable description sent to payer
     * @param metadata any data up to 3 pairs of key-values
     * @param internalReference your own internal reference
     */
    createPayment(mandateID, amount) {
        var currency = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'EUR';
        var chargeDate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var description = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
        var metadata = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
        var internalReference = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

        var body = {
            payments: {
                amount,
                currency,
                metadata,
                charge_date: chargeDate && yyyymmdd(chargeDate),
                reference: internalReference || '',
                description: description || '',
                links: {
                    mandate: mandateID
                }
            }
        };
        var path = '/payments';
        var method = 'POST';
        var options = buildOptions(this.token, this.endPoint, path, method, body);
        return goCardlessRequest(options);
    }

    /**
     * retrieves single payment by id
     * https://developer.gocardless.com/pro/2015-07-06/#payments-get-a-single-payment
     * @param id
     */
    getPayment(id) {
        var path = `/payments?${ id }`;
        var method = 'GET';
        var options = buildOptions(this.token, this.endPoint, path, method, null);
        return goCardlessRequest(options);
    }

    /**
     * List payments
     * https://developer.gocardless.com/pro/2015-07-06/#payments-list-payments
     * @param queryString
     */
    queryPayments(queryString) {
        var path = `/payments?${ queryString }`;
        var method = 'GET';
        var options = buildOptions(this.token, this.endPoint, path, method, null);
        return goCardlessRequest(options);
    }

    /**
     * Updates a payment Object, accepts only metadata
     * https://developer.gocardless.com/pro/2015-07-06/#payments-update-a-payment
     * @param id
     * @param metadata
     */
    updatePayment(id, metadata) {
        var path = `/payments?${ id }`;
        var method = 'PUT';
        var options = buildOptions(this.token, this.endPoint, path, method, metadata);
        return goCardlessRequest(options);
    }

    /**
     * Cancels a single payment if not already submitted to the banks, accepts only metadata
     * https://developer.gocardless.com/pro/2015-07-06/#payments-cancel-a-payment
     * @param id
     * @param metadata
     */
    cancelPayment(id, metadata) {
        var path = `/payments?${ id }/actions/cancel`;
        var method = 'POST';
        var options = buildOptions(this.token, this.endPoint, path, method, metadata);
        return goCardlessRequest(options);
    }

    /**
     * retries a failed payment. you will receive a webhook.
     * https://developer.gocardless.com/pro/2015-07-06/#payments-retry-a-payment
     * @param id
     * @param metadata
     */
    retryPayment(id, metadata) {
        var path = `/payments?${ id }/actions/retry`;
        var method = 'POST';
        var options = buildOptions(this.token, this.endPoint, path, method, metadata);
        return goCardlessRequest(options);
    }

    /**
     * retrieves single mandate by id
     * https://developer.gocardless.com/pro/2015-07-06/#mandates-get-a-single-mandate
     * @param id
     */
    getMandate(id) {
        var path = `/mandates/${ id }`;
        var method = 'GET';
        var options = buildOptions(this.token, this.endPoint, path, method, null);
        return goCardlessRequest(options);
    }

    /**
     * Sends a request for subscription creation
     * https://developer.gocardless.com/pro/2015-07-06/#subscriptions-create-a-subscription
     * @param subscriptionData REQUIRED object to subscription data
     */
    createSubscription(subscriptionData) {
        var path = '/subscriptions';
        var method = 'POST';
        var options = buildOptions(this.token, this.endPoint, path, method, subscriptionData);
        return goCardlessRequest(options);
    }
}
exports.default = GoCardless;