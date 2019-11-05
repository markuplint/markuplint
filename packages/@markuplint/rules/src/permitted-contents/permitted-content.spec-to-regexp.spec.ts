import htmlSpec from './html-spec';
import specToRegExp from './permitted-content.spec-to-regexp';

test('empty', () => {
	expect(specToRegExp([]).source).toEqual('^$');
});

test('ordered required', () => {
	expect(
		specToRegExp([
			{
				require: 'a',
			},
			{
				require: 'b',
			},
			{
				require: 'c',
			},
		]).source,
	).toEqual('^<a><b><c>$');
});

test('ordered optional', () => {
	expect(
		specToRegExp([
			{
				optional: 'a',
			},
			{
				optional: 'b',
			},
			{
				optional: 'c',
			},
		]).source,
	).toEqual('^(?:<a>)?(?:<b>)?(?:<c>)?$');
});

test('ordered zeroOrMore', () => {
	expect(
		specToRegExp([
			{
				zeroOrMore: 'a',
			},
			{
				zeroOrMore: 'b',
			},
			{
				zeroOrMore: 'c',
			},
		]).source,
	).toEqual('^(?:<a>)*(?:<b>)*(?:<c>)*$');
});

test('ordered oneOrMore', () => {
	expect(
		specToRegExp([
			{
				oneOrMore: 'a',
			},
			{
				oneOrMore: 'b',
			},
			{
				oneOrMore: 'c',
			},
		]).source,
	).toEqual('^(?:<a>)+(?:<b>)+(?:<c>)+$');
});

test('ordered mixed', () => {
	expect(
		specToRegExp([
			{
				oneOrMore: 'a',
			},
			{
				require: 'b',
			},
			{
				zeroOrMore: 'c',
			},
			{
				optional: 'd',
			},
			{
				require: 'e',
				min: 3,
			},
			{
				require: 'f',
				min: 3,
				max: 10,
			},
			{
				require: 'g',
				max: 5,
			},
		]).source,
	).toEqual('^(?:<a>)+<b>(?:<c>)*(?:<d>)?(?:<e>){3,3}(?:<f>){3,10}(?:<g>){1,5}$');
});

test('choice required', () => {
	expect(
		specToRegExp([
			{
				choice: [
					[
						{
							require: 'a',
						},
					],
					[
						{
							require: 'b',
						},
					],
					[
						{
							require: 'c',
						},
					],
				],
			},
		]).source,
	).toEqual('^(?:<a>|<b>|<c>)$');
});

test('choice required', () => {
	expect(
		specToRegExp([
			{
				require: ['a', 'b', 'c'],
			},
		]).source,
	).toEqual('^(?:<a>|<b>|<c>)$');
});

test('interleave required', () => {
	expect(
		specToRegExp([
			{
				interleave: [
					[
						{
							require: 'a',
						},
					],
					[
						{
							require: 'b',
						},
					],
					[
						{
							require: 'c',
						},
					],
				],
			},
		]).source,
	).toEqual('^(?:<a><b><c>|<a><c><b>|<b><a><c>|<b><c><a>|<c><a><b>|<c><b><a>)$');
});

test('ignore', () => {
	expect(
		specToRegExp([
			{
				require: ['a', 'b', 'c'],
				ignore: 'a',
			},
		]).source,
	).toEqual('^(?:<b>|<c>)$');
});

test('group oneOrMore', () => {
	expect(
		specToRegExp([
			{
				oneOrMore: [
					{
						require: 'a',
					},
					{
						require: 'b',
					},
				],
			},
		]).source,
	).toEqual('^(?:<a><b>)+$');
});

test('content model alias', () => {
	expect(
		specToRegExp([
			{
				require: '#flow',
			},
		]).source,
	).toEqual(
		'^(?:<a>|<abbr>|<address>|<article>|<aside>|<audio>|<b>|<bdo>|<bdi>|<blockquote>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<del>|<details>|<dfn>|<div>|<dl>|<em>|<embed>|<fieldset>|<figure>|<footer>|<form>|<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<header>|<hgroup>|<hr>|<i>|<iframe>|<img>|<input>|<ins>|<kbd>|<label>|<main>|<map>|<mark>|<math>|<menu>|<meter>|<nav>|<noscript>|<object>|<ol>|<output>|<p>|<pre>|<progress>|<q>|<ruby>|<s>|<samp>|<script>|<section>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<table>|<template>|<textarea>|<time>|<ul>|<var>|<video>|<wbr>|<#custom>|<#text>|<area@map>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<meta【itemprop】>)$',
	);
});

test('content model alias', () => {
	expect(
		specToRegExp([
			{
				require: ['a', '#flow'],
			},
		]).source,
	).toEqual(
		'^(?:<a>|<abbr>|<address>|<article>|<aside>|<audio>|<b>|<bdo>|<bdi>|<blockquote>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<del>|<details>|<dfn>|<div>|<dl>|<em>|<embed>|<fieldset>|<figure>|<footer>|<form>|<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<header>|<hgroup>|<hr>|<i>|<iframe>|<img>|<input>|<ins>|<kbd>|<label>|<main>|<map>|<mark>|<math>|<menu>|<meter>|<nav>|<noscript>|<object>|<ol>|<output>|<p>|<pre>|<progress>|<q>|<ruby>|<s>|<samp>|<script>|<section>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<table>|<template>|<textarea>|<time>|<ul>|<var>|<video>|<wbr>|<#custom>|<#text>|<area@map>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<meta【itemprop】>)$',
	);
});

test('content model alias', () => {
	expect(
		specToRegExp([
			{
				require: '#transparent',
			},
		]).source,
	).toEqual('^<[^>]+>$');
});

test('a', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('a').contents).source).toEqual(
		'^(?:(?<NAD__interactive>(?:<a>|<abbr>|<address>|<article>|<aside>|<audio>|<b>|<bdo>|<bdi>|<blockquote>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<del>|<details>|<dfn>|<div>|<dl>|<em>|<embed>|<fieldset>|<figure>|<footer>|<form>|<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<header>|<hgroup>|<hr>|<i>|<iframe>|<img>|<input>|<ins>|<kbd>|<label>|<main>|<map>|<mark>|<math>|<menu>|<meter>|<nav>|<noscript>|<object>|<ol>|<output>|<p>|<pre>|<progress>|<q>|<ruby>|<s>|<samp>|<script>|<section>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<table>|<template>|<textarea>|<time>|<ul>|<var>|<video>|<wbr>|<#custom>|<#text>|<area@map>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<meta【itemprop】>)*)|(?:<abbr>|<audio>|<b>|<bdo>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<dfn>|<em>|<embed>|<i>|<iframe>|<img>|<input>|<kbd>|<label>|<mark>|<math>|<meter>|<noscript>|<object>|<output>|<progress>|<q>|<ruby>|<samp>|<script>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<textarea>|<time>|<var>|<video>|<wbr>|<#text>|<a>|<area@map>|<del>|<ins>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<map>|<meta【itemprop】>)*)$',
	);
});

test('audio', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('audio').contents).source).toEqual(
		'^(?<NAD_source_audio_video>(?:<source>)*(?:<track>)*(?:<[^>]+>)*)$',
	);
});

test('head', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('head').contents).source).toEqual(
		'^(?:(?:<base>|<link>|<meta>|<noscript>|<script>|<style>|<template>)*<title>|<title>(?:<base>|<link>|<meta>|<noscript>|<script>|<style>|<template>)*)$',
	);
});

test('picture', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('picture').contents).source).toEqual(
		'^(?:<script>|<template>)*(?:<source>)*(?:<script>|<template>)*<img>(?:<script>|<template>)*$',
	);
});

test('ruby', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('ruby').contents).source).toEqual(
		'^(?:(?:<abbr>|<audio>|<b>|<bdo>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<dfn>|<em>|<embed>|<i>|<iframe>|<img>|<input>|<kbd>|<label>|<mark>|<math>|<meter>|<noscript>|<object>|<output>|<progress>|<q>|<ruby>|<samp>|<script>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<textarea>|<time>|<var>|<video>|<wbr>|<#text>|<a>|<area@map>|<del>|<ins>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<map>|<meta【itemprop】>)(?:(?:<rt>)+|(?:<rp>(?:<rt><rp>)+)+))+$',
	);
});

test('select', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('select').contents).source).toEqual('^(?:<option>|<optgroup>)*$');
});

test('summary', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('summary').contents).source).toEqual(
		'^(?:(?:<abbr>|<audio>|<b>|<bdo>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<dfn>|<em>|<embed>|<i>|<iframe>|<img>|<input>|<kbd>|<label>|<mark>|<math>|<meter>|<noscript>|<object>|<output>|<progress>|<q>|<ruby>|<samp>|<script>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<textarea>|<time>|<var>|<video>|<wbr>|<#text>|<a>|<area@map>|<del>|<ins>|<link【itemprop】>|<link【rel=dns-prefetch】>|<link【rel=modulepreload】>|<link【rel=pingback】>|<link【rel=preconnect】>|<link【rel=prefetch】>|<link【rel=preload】>|<link【rel=prerender】>|<link【rel=stylesheet】>|<map>|<meta【itemprop】>)*|(?:<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<hgroup>)?)$',
	);
});

test('table', () => {
	// @ts-ignore
	expect(specToRegExp(htmlSpec('table').contents).source).toEqual(
		'^(?:<script>|<template>)*(?:<caption>)?(?:<script>|<template>)*(?:<colgroup>)*(?:<script>|<template>)*(?:<thead>)?(?:<script>|<template>)*(?:(?:<tbody>)?|(?:<tr>)+)(?:<script>|<template>)*(?:<tfoot>)?(?:<script>|<template>)*$',
	);
});
