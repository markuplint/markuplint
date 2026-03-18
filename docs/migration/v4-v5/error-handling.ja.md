# v5 エラーハンドリングの変更点

破壊的変更はありません。既存の import パスと API はそのまま動作します。

## 新機能: `isFatalError()` ガード関数

`@markuplint/shared` から新しいユーティリティ関数が利用可能になりました。catch したエラーを Fatal（Tier 1）かリカバリ可能（Tier 2/3）かに分類します。カスタムルールやプラグインの `catch` ブロックで使えます。

```typescript
import { isFatalError } from '@markuplint/shared';

try {
  // ...
} catch (error) {
  if (isFatalError(error)) {
    throw error; // TypeError, ReferenceError など
  }
  // リカバリ可能なエラーの処理
}
```

エラー階層の詳細は[エラーハンドリングポリシー](../architectures/ERROR-HANDLING.ja.md)を参照してください。
