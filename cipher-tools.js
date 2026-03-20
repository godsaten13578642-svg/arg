(function () {
  const encMap = {
    a: 'q', b: 'w', c: 'e', d: 'r', e: 't', f: 'y', g: 'u', h: 'i', i: 'o', j: 'p',
    k: 'a', l: 's', m: 'd', n: 'f', o: 'g', p: 'h', q: 'j', r: 'k', s: 'l', t: 'z',
    u: 'x', v: 'c', w: 'v', x: 'b', y: 'n', z: 'm'
  };

  const decMap = Object.fromEntries(Object.entries(encMap).map(([k, v]) => [v, k]));

  const numEnc = {
    '1': '4', '2': '2', '3': '5', '4': '8', '5': '1',
    '6': '6', '7': '9', '8': '3', '9': '7', '0': '-'
  };

  const numDec = Object.fromEntries(Object.entries(numEnc).map(([k, v]) => [v, k]));

  function encrypt(text) {
    return text.toLowerCase().split(" ").map((word) => {
      const converted = word.split('').map((c) => {
        if (encMap[c]) return encMap[c];
        if (numEnc[c]) return numEnc[c];
        return c;
      }).join('');
      return converted.split('').reverse().join('');
    }).join(" ");
  }

  function decrypt(text) {
    return text.toLowerCase().split(" ").map((word) => {
      const reversed = word.split('').reverse().join('');
      return reversed.split('').map((c) => {
        if (decMap[c]) return decMap[c];
        if (numDec[c]) return numDec[c];
        return c;
      }).join('');
    }).join(" ");
  }

  window.argCipher = { encrypt, decrypt };

  const leftBox = document.getElementById('decryptor-box');
  const rightBox = document.getElementById('encryptor-box');

  if (!leftBox || !rightBox) return;

  document.getElementById("encBtn").onclick = () => {
    const input = document.getElementById("encIn").value;
    document.getElementById("encOut").value = encrypt(input);
  };

  document.getElementById("decBtn").onclick = () => {
    const input = document.getElementById("decIn").value;
    document.getElementById("decOut").value = decrypt(input);
  };
})();
