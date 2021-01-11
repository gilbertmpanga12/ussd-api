
function checkNetworkOperator(phoneNumber) {
    let networkoperator;
    switch(phoneNumber.substring(3,5)){
      case "78":
        networkoperator = "MTN";
        break;
      case "77":
        networkoperator = "MTN";
        break;
      case "75":
        networkoperator = "Airtel";
        break;
      case "70":
        networkoperator = "Airtel";
        break;
      default:
        networkoperator =  "Other Networks";
    }
    return networkoperator;
  }

exports.checkNetworkOperator = checkNetworkOperator;