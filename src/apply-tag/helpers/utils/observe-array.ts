
export const observeArray = (arr: any[], callback: Function) => {
    ['pop', 'push', 'reverse', 'shift', 'unshift', 'splice', 'sort'].forEach((m) => {
        arr[m] = function () {
            var res = Array.prototype[m].apply(arr, arguments);
            callback.apply(arr, arguments);

            return res;
        };
    });
};


