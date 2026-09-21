import { NextRequest, NextResponse } from "next/server";

function getBackendUrl() {
    return (
        process.env.BACKEND_PUBLIC_URL ??
        process.env.BACKEND_INTERNAL_URL ??
        "http://localhost:4000"
    ).replace(/\/$/, "");
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const target = `${getBackendUrl()}/api/${path.join("/")}${request.nextUrl.search}`;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");

    const body =
        request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer();

    const response = await fetch(target, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-length");

    return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;