module.exports = (num) => {
    const zeropadding = '00';
    return zeropadding.slice(0, zeropadding.length - num.length) + num;
}

