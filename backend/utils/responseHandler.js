const response = (res, statusCode, message, data=null) =>{
    if(!res || !statusCode || !message) {
        console.error("Response handler: Missing required parameters");
        return;
    }
    const responseObject = {
        status: statusCode < 400 ? "success" : "error",
        message: message,
        data: data
    };
    return res.status(statusCode).json(responseObject);
}

module.exports = response;