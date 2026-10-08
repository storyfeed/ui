import type { FeedNode } from '../shared/types';
import FeedItem from './FeedItem';
import type { NodeProps } from './FeedItem';
import FeedGroup from './FeedGroup';
export default function FeedNodeView({
    item,
    ...props
}: NodeProps & { item: FeedNode }) {
    if (item.kind === 'activity') return <FeedItem item={item} {...props} />;
    if (item.kind === 'group') return <FeedGroup item={item} {...props} />;
    return null;
}
