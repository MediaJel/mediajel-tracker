import { afterEach, describe, expect, test } from "bun:test";

import { captureRuntime } from "@mediajel/tracker-widget/runtime";

const realFetch = window.fetch;
const realOpen = XMLHttpRequest.prototype.open;
const realSend = XMLHttpRequest.prototype.send;

afterEach(() => {
  window.fetch = realFetch;
  XMLHttpRequest.prototype.open = realOpen;
  XMLHttpRequest.prototype.send = realSend;
});

describe("captureRuntime", () => {
  test("reaches the original fetch after the recorder has wrapped window.fetch", async () => {
    const calls: string[] = [];
    window.fetch = ((input: string) => {
      calls.push(`original ${input}`);
      return Promise.resolve(new Response("{}"));
    }) as unknown as typeof fetch;

    const runtime = captureRuntime();

    window.fetch = (() => {
      calls.push("recorder");
      return Promise.resolve(new Response("{}"));
    }) as unknown as typeof fetch;

    await runtime.pristineFetch("https://gateway.example/v1/messages");

    // The whole point: a provider call and a GitHub call must be invisible to the recorder,
    // so an API key can never end up inside a recorded request body.
    expect(calls).toEqual(["original https://gateway.example/v1/messages"]);
  });

  test("survives being pulled off the runtime object", async () => {
    let received = "";
    window.fetch = ((input: string) => {
      received = input;
      return Promise.resolve(new Response("{}"));
    }) as unknown as typeof fetch;

    // Bound at capture: calling it with no receiver must not be an illegal invocation.
    const { pristineFetch } = captureRuntime();
    await pristineFetch("https://api.github.com/user");

    expect(received).toBe("https://api.github.com/user");
  });

  test("reaches the original XHR open and send after both are wrapped", () => {
    const calls: string[] = [];
    XMLHttpRequest.prototype.open = function patchedFirst(this: XMLHttpRequest, ...args: never[]) {
      calls.push("original open");
      return realOpen.apply(this, args as never);
    };
    XMLHttpRequest.prototype.send = function patchedFirst() {
      calls.push("original send");
    };

    const runtime = captureRuntime();

    XMLHttpRequest.prototype.open = () => calls.push("recorder open");
    XMLHttpRequest.prototype.send = () => calls.push("recorder send");

    const xhr = new XMLHttpRequest();
    runtime.pristineXhrOpen.call(xhr, "GET", "https://api.github.com/user", true);
    runtime.pristineXhrSend.call(xhr);

    expect(calls).toEqual(["original open", "original send"]);
  });

  test("captures the references that existed at the moment it ran, not later ones", () => {
    const first = captureRuntime();
    window.fetch = (() => Promise.resolve(new Response(""))) as unknown as typeof fetch;
    const second = captureRuntime();

    expect(first.pristineFetch).not.toBe(second.pristineFetch);
  });
});
