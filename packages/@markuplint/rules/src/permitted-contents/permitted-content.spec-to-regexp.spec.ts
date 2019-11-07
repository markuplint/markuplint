import ExpGenerator from './permitted-content.spec-to-regexp';
import htmlSpec from './html-spec';

test('empty', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp([]).source).toEqual('^$');
});

test('ordered required', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
			{
				require: ['a', 'b', 'c'],
			},
		]).source,
	).toEqual('^(?:<a>|<b>|<c>)$');
});

test('interleave required', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
			{
				require: ['a', 'b', 'c'],
				ignore: 'a',
			},
		]).source,
	).toEqual('^(?:<b>|<c>)$');
});

test('group oneOrMore', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
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
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
			{
				require: '#flow',
			},
		]).source,
	).toEqual(
		'^(?:<a>|<abbr>|<address>|<article>|<aside>|<audio>|<b>|<bdo>|<bdi>|<blockquote>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<del>|<details>|<dfn>|<div>|<dl>|<em>|<embed>|<fieldset>|<figure>|<footer>|<form>|<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<header>|<hgroup>|<hr>|<i>|<iframe>|<img>|<input>|<ins>|<kbd>|<label>|<main>|<map>|<mark>|<math>|<menu>|<meter>|<nav>|<noscript>|<object>|<ol>|<output>|<p>|<pre>|<progress>|<q>|<ruby>|<s>|<samp>|<script>|<section>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<table>|<template>|<textarea>|<time>|<ul>|<var>|<video>|<wbr>|(?:<[a-z](?:\\-|\\.|[0-9]|_|[a-z]|\u00B7|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\uD800-\uDBFF][\uDC00-\uDFFF])*\\-(?:\\-|\\.|[0-9]|_|[a-z]|\u00B7|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\uD800-\uDBFF][\uDC00-\uDFFF])*>)|<#text>|<area>|(?<ACM_0_flow_link><link>)|(?<ACM_0_flow_meta><meta>))$',
	);
});

test('content model alias', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
			{
				require: ['a', '#flow'],
			},
		]).source,
	).toEqual(
		'^(?:<a>|<abbr>|<address>|<article>|<aside>|<audio>|<b>|<bdo>|<bdi>|<blockquote>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<del>|<details>|<dfn>|<div>|<dl>|<em>|<embed>|<fieldset>|<figure>|<footer>|<form>|<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<header>|<hgroup>|<hr>|<i>|<iframe>|<img>|<input>|<ins>|<kbd>|<label>|<main>|<map>|<mark>|<math>|<menu>|<meter>|<nav>|<noscript>|<object>|<ol>|<output>|<p>|<pre>|<progress>|<q>|<ruby>|<s>|<samp>|<script>|<section>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<table>|<template>|<textarea>|<time>|<ul>|<var>|<video>|<wbr>|(?:<[a-z](?:\\-|\\.|[0-9]|_|[a-z]|\u00B7|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\uD800-\uDBFF][\uDC00-\uDFFF])*\\-(?:\\-|\\.|[0-9]|_|[a-z]|\u00B7|[\u00C0-\u00D6]|[\u00D8-\u00F6]|[\u00F8-\u037D]|[\u037F-\u1FFF]|[\u200C-\u200D]|[\u203F-\u2040]|[\u2070-\u218F]|[\u2C00-\u2FEF]|[\u3001-\uD7FF]|[\uF900-\uFDCF]|[\uFDF0-\uFFFD]|[\uD800-\uDBFF][\uDC00-\uDFFF])*>)|<#text>|<area>|(?<ACM_0_flow_link><link>)|(?<ACM_0_flow_meta><meta>))$',
	);
});

test('content model alias', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp([
			{
				require: '#transparent',
			},
		]).source,
	).toEqual('^(?<TRANSPARENT_00><[^>]+>)$');
});

test('a', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('a')!.contents).source).toEqual(
		'^(?<NAD_00__interactive___InTRANSPARENT>(?:(?<TRANSPARENT_01><[^>]+>))*)$',
	);
});

test('audio', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('audio')!.contents).source).toEqual(
		'^(?<NAD_00_source_audio_video___InTRANSPARENT>(?:<source>)*(?:<track>)*(?:(?<TRANSPARENT_01><[^>]+>))*)$',
	);
});

test('head', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('head')!.contents).source).toEqual(
		'^(?:<base>|<link>|<meta>|<noscript>|<script>|<style>|<template>)*<title>(?:<base>|<link>|<meta>|<noscript>|<script>|<style>|<template>)*$',
	);
});

test('picture', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('picture')!.contents).source).toEqual(
		'^(?:<script>|<template>)*(?:<source>)*(?:<script>|<template>)*<img>(?:<script>|<template>)*$',
	);
});

test('ruby', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('ruby')!.contents).source).toEqual(
		'^(?<NAD_00_ruby>(?:<abbr>|<audio>|<b>|<bdo>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<dfn>|<em>|<embed>|<i>|<iframe>|<img>|<input>|<kbd>|<label>|<mark>|<math>|<meter>|<noscript>|<object>|<output>|<progress>|<q>|<ruby>|<samp>|<script>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<textarea>|<time>|<var>|<video>|<wbr>|<#text>|<a>|<area>|<del>|<ins>|(?<ACM_0_phrasing_link><link>)|<map>|(?<ACM_0_phrasing_meta><meta>))(?:(?:<rt>)+|(?:<rp>(?:<rt><rp>)+)+))+$',
	);
});

test('select', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('select')!.contents).source).toEqual('^(?:<option>|<optgroup>)*$');
});

test('summary', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('summary')!.contents).source).toEqual(
		'^(?:(?:<abbr>|<audio>|<b>|<bdo>|<br>|<button>|<canvas>|<cite>|<code>|<data>|<datalist>|<dfn>|<em>|<embed>|<i>|<iframe>|<img>|<input>|<kbd>|<label>|<mark>|<math>|<meter>|<noscript>|<object>|<output>|<progress>|<q>|<ruby>|<samp>|<script>|<select>|<small>|<span>|<strong>|<sub>|<sup>|<svg>|<textarea>|<time>|<var>|<video>|<wbr>|<#text>|<a>|<area>|<del>|<ins>|(?<ACM_0_phrasing_link><link>)|<map>|(?<ACM_0_phrasing_meta><meta>))*|(?:<h1>|<h2>|<h3>|<h4>|<h5>|<h6>|<hgroup>)?)$',
	);
});

test('table', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('table')!.contents).source).toEqual(
		'^(?:<script>|<template>)*(?:<caption>)?(?:<script>|<template>)*(?:<colgroup>)*(?:<script>|<template>)*(?:<thead>)?(?:<script>|<template>)*(?:(?:<tbody>)?|(?:<tr>)+)(?:<script>|<template>)*(?:<tfoot>)?(?:<script>|<template>)*$',
	);
});

test('audio in audio / Duplicate capture group name', () => {
	const expGen = new ExpGenerator(0);
	expect(
		expGen.specToRegExp(htmlSpec('audio')!.contents, expGen.specToRegExp(htmlSpec('audio')!.contents)).source,
	).toEqual(
		'^(?<NAD_02_source_audio_video___InTRANSPARENT>(?:<source>)*(?:<track>)*(?:(?<TRANSPARENT_03>(?<NAD_00_source_audio_video___InTRANSPARENT>(?:<source>)*(?:<track>)*(?:(?<TRANSPARENT_01><[^>]+>))*)))*)$',
	);
});

test('area / Ancestor', () => {
	const expGen = new ExpGenerator(0);
	expect(expGen.specToRegExp(htmlSpec('table')!.contents).source).toEqual(
		'^(?:<script>|<template>)*(?:<caption>)?(?:<script>|<template>)*(?:<colgroup>)*(?:<script>|<template>)*(?:<thead>)?(?:<script>|<template>)*(?:(?:<tbody>)?|(?:<tr>)+)(?:<script>|<template>)*(?:<tfoot>)?(?:<script>|<template>)*$',
	);
});
