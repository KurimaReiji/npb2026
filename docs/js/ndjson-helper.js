class NdJsonStream extends TransformStream {
  constructor() {
    super({
      transform(chunk, controller) {
        const lines = `${this._remainder || ""}${chunk}`.split(/\r?\n/);
        this._remainder = lines.pop();
        try {
          const parsed = JSON.parse(`[${lines.filter(Boolean).join(",")}]`);
          parsed.forEach((item) => {
            controller.enqueue(item);
          });
        } catch (error) {
          console.error("JSON parse error:", error, `\nRaw chunk: "${chunk}"`, `\nLines: ${JSON.stringify(lines)}`);
        }
      },
      flush(controller) {
        if (this._remainder) {
          try {
            const parsed = JSON.parse(`[${this._remainder}]`);
            parsed.forEach((item) => {
              controller.enqueue(item);
            });
          } catch (error) {
            console.error("JSON parse error on flush:", error, `\nRemainder: "${this._remainder}"`);
          }
          this._remainder = "";
        }
      }
    });
    this._remainder = "";
  }
}

async function* parseNdJson(response) {
  const stream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new NdJsonStream());

  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
 * 条件に一致するオブジェクトだけを通す TransformStream
 * @param {Function} predicate - (data) => boolean
 */
function createFilterStream(predicate) {
  return new TransformStream({
    transform(chunk, controller) {
      if (predicate(chunk)) {
        controller.enqueue(chunk); // 条件一致なら次へ流す
      }
      // 一致しない場合は何もしない（＝捨てられる）
    }
  });
}

export {
  NdJsonStream,
  parseNdJson,
  createFilterStream,
}