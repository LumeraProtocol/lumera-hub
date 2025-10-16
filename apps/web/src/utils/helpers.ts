export const getMessages = (msgs: { '@type'?: string; typeUrl?: string }[]) => {
    if (msgs) {
        const sum: Record<string, number> = msgs
          .map((msg) => {
            const msgType = msg['@type'] || msg.typeUrl || 'unknown';
            return msgType
              .substring(msgType.lastIndexOf('.') + 1)
              .replace('Msg', '');
          })
          .reduce((s, c) => {
            const sh: Record<string, number> = s;
            if (sh[c]) {
              sh[c] += 1;
            } else {
              sh[c] = 1;
            }
            return sh;
          }, {});
        const output: string[] = [];
        Object.keys(sum).forEach((k) => {
          output.push(sum[k] > 1 ? `${k}×${sum[k]}` : k);
        });
        return output.join(', ');
    }
    return '';
}